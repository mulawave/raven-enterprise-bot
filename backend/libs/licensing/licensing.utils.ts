import { createHash, randomBytes } from 'crypto'

/**
 * Generate a license key in the format:
 * RVN-{REG|EXT}-{8 alphanumeric}-{8 alphanumeric}-{4 checksum}
 */
export function generateLicenseKey(type: 'REGULAR' | 'EXTENDED'): string {
  const prefix = type === 'EXTENDED' ? 'EXT' : 'REG'
  const seg1 = randomBytes(4).toString('hex').toUpperCase().slice(0, 8)
  const seg2 = randomBytes(4).toString('hex').toUpperCase().slice(0, 8)
  const raw = `RVN-${prefix}-${seg1}-${seg2}`
  const checksum = createHash('sha256').update(raw).digest('hex').slice(0, 4).toUpperCase()
  return `${raw}-${checksum}`
}

/** SHA-256 hash of a license key for safe storage */
export function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** Extract the last 8 visible characters for safe logging */
export function partialKey(key: string): string {
  return key.length > 8 ? key.slice(-8) : key
}

/** Generate a unique verification token for phone-home calls */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

/** SHA-256-based deployment fingerprint from env/version markers */
export function generateFingerprint(domain: string): string {
  const seed = `${domain}:${process.env.DATABASE_URL ?? ''}:${process.env.JWT_SECRET ?? ''}`
  return createHash('sha256').update(seed).digest('hex').slice(0, 32)
}
