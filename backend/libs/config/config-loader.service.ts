import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Reads config values from the SystemConfig DB table first,
 * falling back to process.env. In-memory cache is refreshed
 * every CACHE_TTL_MS to reduce DB round-trips.
 */
@Injectable()
export class ConfigLoaderService {
  private readonly logger = new Logger(ConfigLoaderService.name)
  private cache: Map<string, string | null> = new Map()
  private cacheLoadedAt = 0
  private readonly CACHE_TTL_MS = 60_000 // 1 minute

  constructor(private readonly prisma: PrismaClient) {}

  async get(key: string): Promise<string | undefined> {
    await this.maybeRefreshCache()
    if (this.cache.has(key) && this.cache.get(key) !== null) {
      return this.cache.get(key) as string
    }
    // fall back to environment variable
    return process.env[key]
  }

  /** Forces a full cache refresh — call after admin updates a key */
  async refresh(): Promise<void> {
    this.cacheLoadedAt = 0
    await this.maybeRefreshCache()
  }

  private async maybeRefreshCache(): Promise<void> {
    if (Date.now() - this.cacheLoadedAt < this.CACHE_TTL_MS) return
    try {
      const rows = await this.prisma.systemConfig.findMany()
      const next = new Map<string, string | null>()
      for (const row of rows) {
        next.set(row.key, row.value ?? null)
      }
      this.cache = next
      this.cacheLoadedAt = Date.now()
    } catch (err) {
      this.logger.warn(`ConfigLoader cache refresh failed: ${(err as Error).message}`)
    }
  }
}
