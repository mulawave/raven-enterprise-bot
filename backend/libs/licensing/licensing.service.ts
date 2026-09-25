import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { GeneratedLicenseActivation, GeneratedPrismaClient } from '../../types/prisma-generated'
import {
  generateLicenseKey,
  hashLicenseKey,
  partialKey,
  generateVerificationToken,
  generateFingerprint,
} from './licensing.utils'

@Injectable()
export class LicensingService {
  private readonly logger = new Logger(LicensingService.name)

  constructor(private readonly prisma: PrismaClient) {}

  /* ── Admin: Key management ─────────────────────────────────────────── */

  async generateKey(input: {
    type: 'REGULAR' | 'EXTENDED'
    buyer_email: string
    buyer_name: string
    max_domains?: number
  }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const rawKey = generateLicenseKey(input.type)
    const keyHash = hashLicenseKey(rawKey)

    const license = await prisma.license.create({
      data: {
        key_hash: keyHash,
        key_display: rawKey,
        type: input.type,
        status: 'ACTIVE',
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name,
        max_domains: input.type === 'REGULAR' ? 1 : (input.max_domains ?? 5),
      },
    })

    return { license, rawKey }
  }

  async listKeys(filters?: { status?: string; type?: string }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const where: Record<string, unknown> = {}
    if (filters?.status) where.status = filters.status
    if (filters?.type) where.type = filters.type

    return prisma.license.findMany({
      where,
      include: { activations: true },
      orderBy: { created_at: 'desc' },
    })
  }

  async deleteKey(licenseId: string) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient

    // Cascade will delete activations; delete the license entirely
    await prisma.license.delete({
      where: { id: licenseId },
    })

    return { deleted: true }
  }

  async revokeKey(licenseId: string) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient

    const license = await prisma.license.update({
      where: { id: licenseId },
      data: { status: 'REVOKED', revoked_at: new Date() },
    })

    // Also revoke all activations for this license
    await prisma.licenseActivation.updateMany({
      where: { license_id: licenseId },
      data: { status: 'REVOKED' },
    })

    return license
  }

  /* ── Admin: Activation management ──────────────────────────────────── */

  async listActivations(filters?: { status?: string; license_id?: string }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const where: Record<string, unknown> = {}
    if (filters?.status) where.status = filters.status
    if (filters?.license_id) where.license_id = filters.license_id

    return prisma.licenseActivation.findMany({
      where,
      include: { license: true },
      orderBy: { created_at: 'desc' },
    })
  }

  async approveActivation(activationId: string) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient

    return prisma.licenseActivation.update({
      where: { id: activationId },
      data: { status: 'ACTIVE', activated_at: new Date() },
    })
  }

  async revokeActivation(activationId: string) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient

    return prisma.licenseActivation.update({
      where: { id: activationId },
      data: { status: 'REVOKED' },
    })
  }

  /* ── Admin: Attempt logs ───────────────────────────────────────────── */

  async listAttempts(filters?: { status?: string; domain?: string }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const where: Record<string, unknown> = {}
    if (filters?.status) where.status = filters.status
    if (filters?.domain) where.domain = filters.domain

    return prisma.activationAttempt.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 200,
    })
  }

  /* ── Public: Activation flow ───────────────────────────────────────── */

  async activate(input: {
    license_key: string
    email: string
    domain: string
    ip_address: string
    user_agent?: string
  }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const { license_key, email, domain, ip_address, user_agent } = input

    // Check blacklist
    const isBlacklisted = await this.isBlacklisted(ip_address, domain)
    if (isBlacklisted) {
      await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'BLACKLISTED', failure_reason: 'IP or domain is blacklisted' })
      return { status: 'rejected', message: 'This activation request has been blocked.' }
    }

    const keyHash = hashLicenseKey(license_key)

    // Look up license by hash
    const license = await prisma.license.findUnique({
      where: { key_hash: keyHash },
      include: { activations: true },
    })

    if (!license || license.status !== 'ACTIVE') {
      await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'REJECTED', failure_reason: license ? `License status: ${license.status}` : 'Invalid license key' })
      return { status: 'rejected', message: 'Invalid or revoked license key.' }
    }

    // Validate email matches buyer
    if (license.buyer_email.toLowerCase() !== email.toLowerCase()) {
      await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'REJECTED', failure_reason: 'Email does not match license holder' })
      return { status: 'rejected', message: 'The email address does not match the license holder.' }
    }

    // Check existing activation for this domain
    const existingForDomain = license.activations.find((a: GeneratedLicenseActivation) => a.domain === domain)
    if (existingForDomain) {
      if (existingForDomain.status === 'ACTIVE') {
        // Re-activation on same domain — return success
        await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'SUCCESS', failure_reason: null })
        return {
          status: 'active',
          license_type: license.type,
          verification_token: existingForDomain.id,
        }
      }
      if (existingForDomain.status === 'REVOKED') {
        await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'REJECTED', failure_reason: 'Domain activation was revoked' })
        return { status: 'rejected', message: 'This domain activation has been revoked. Contact support.' }
      }
      // PENDING — auto-approve now
      await prisma.licenseActivation.update({
        where: { id: existingForDomain.id },
        data: { status: 'ACTIVE', activated_at: new Date(), last_verified_at: new Date() },
      })
      const token = generateVerificationToken()
      await this.upsertInstanceActivation({
        license_key,
        license_type: license.type,
        domain,
        status: 'ACTIVE',
        verification_token: token,
      })
      await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'SUCCESS', failure_reason: null })
      return { status: 'active', license_type: license.type, verification_token: token }
    }

    // Domain count check
    const activeCount = license.activations.filter((a: GeneratedLicenseActivation) => a.status === 'ACTIVE' || a.status === 'PENDING').length
    if (activeCount >= license.max_domains) {
      const msg = license.type === 'REGULAR'
        ? 'This license is already activated on another domain.'
        : `This license has reached its domain limit (${license.max_domains}).`
      await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'REJECTED', failure_reason: msg })
      return { status: 'rejected', message: msg }
    }

    // Create activation — auto-approve for all license types
    const activation = await prisma.licenseActivation.create({
      data: {
        license_id: license.id,
        domain,
        ip_address,
        status: 'ACTIVE',
        activated_at: new Date(),
        last_verified_at: new Date(),
        fingerprint: generateFingerprint(domain),
      },
    })

    await this.logAttempt({ license_key, domain, ip_address, email, user_agent, status: 'SUCCESS', failure_reason: null })

    // Store locally on this instance
    const token = generateVerificationToken()
    await this.upsertInstanceActivation({
      license_key,
      license_type: license.type,
      domain,
      status: 'ACTIVE',
      verification_token: token,
    })

    return { status: 'active', license_type: license.type, verification_token: token }
  }

  /* ── Public: Verification (phone-home) ─────────────────────────────── */

  async verify(input: { verification_token: string; domain: string; fingerprint?: string }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient

    const local = await prisma.instanceActivation.findUnique({
      where: { verification_token: input.verification_token },
    })

    if (!local || local.domain !== input.domain) {
      return { valid: false }
    }

    if (local.status !== 'ACTIVE') {
      return { valid: false, reason: local.status }
    }

    // Update last_verified_at
    await prisma.instanceActivation.update({
      where: { id: local.id },
      data: { last_verified_at: new Date() },
    })

    return { valid: true, license_type: local.license_type }
  }

  /* ── Public: Local status check ────────────────────────────────────── */

  async getLocalStatus() {
    // Master/seller instance — licensing enforcement is off, always report activated
    if (process.env.LICENSING_ENABLED === 'false') {
      return { activated: true, status: 'ACTIVE', license_type: 'MASTER', domain: 'master' }
    }

    const prisma = this.prisma as unknown as GeneratedPrismaClient

    const activation = await prisma.instanceActivation.findFirst({
      orderBy: { created_at: 'desc' },
    })

    if (!activation) {
      return { activated: false }
    }

    return {
      activated: activation.status === 'ACTIVE',
      status: activation.status,
      license_type: activation.license_type,
      domain: activation.domain,
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────── */

  private async upsertInstanceActivation(input: {
    license_key: string
    license_type: string
    domain: string
    status: string
    verification_token: string
  }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const keyHash = hashLicenseKey(input.license_key)
    const fingerprint = generateFingerprint(input.domain)

    const existing = await prisma.instanceActivation.findUnique({
      where: { domain: input.domain },
    })

    if (existing) {
      return prisma.instanceActivation.update({
        where: { id: existing.id },
        data: {
          license_key_hash: keyHash,
          license_type: input.license_type,
          status: input.status,
          activated_at: new Date(),
          last_verified_at: new Date(),
          verification_token: input.verification_token,
          fingerprint,
        },
      })
    }

    return prisma.instanceActivation.create({
      data: {
        license_key_hash: keyHash,
        license_type: input.license_type,
        domain: input.domain,
        status: input.status,
        activated_at: new Date(),
        last_verified_at: new Date(),
        verification_token: input.verification_token,
        fingerprint,
      },
    })
  }

  private async logAttempt(input: {
    license_key: string
    domain: string
    ip_address: string
    email?: string
    user_agent?: string
    status: string
    failure_reason: string | null
  }) {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    try {
      await prisma.activationAttempt.create({
        data: {
          license_key_partial: partialKey(input.license_key),
          domain: input.domain,
          ip_address: input.ip_address,
          email: input.email,
          user_agent: input.user_agent,
          status: input.status,
          failure_reason: input.failure_reason,
        },
      })
    } catch (err) {
      this.logger.warn(`Failed to log activation attempt: ${(err as Error).message}`)
    }
  }

  private async isBlacklisted(ip: string, domain: string): Promise<boolean> {
    const prisma = this.prisma as unknown as GeneratedPrismaClient
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [ipCount, domainCount] = await Promise.all([
      prisma.activationAttempt.count({
        where: { ip_address: ip, status: { in: ['REJECTED', 'BLACKLISTED'] }, created_at: { gte: since } },
      }),
      prisma.activationAttempt.count({
        where: { domain, status: { in: ['REJECTED', 'BLACKLISTED'] }, created_at: { gte: since } },
      }),
    ])

    return ipCount >= 5 || domainCount >= 5
  }
}
