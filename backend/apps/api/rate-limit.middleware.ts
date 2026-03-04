import { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'

const WINDOW_SECONDS = 60
const TENANT_LIMIT = 100
const CHANNEL_LIMIT = 50

/**
 * Returns an Express middleware that rate-limits requests using the provided
 * shared Redis instance (no extra connection opened).
 */
export function rateLimitMiddleware(redis: Redis, type: 'tenant' | 'channel') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key =
      type === 'tenant'
        ? `ratelimit:tenant:${req.headers['x-tenant-id'] || 'unknown'}`
        : `ratelimit:channel:${req.headers['x-channel-id'] || 'unknown'}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS)
    }

    const limit = type === 'tenant' ? TENANT_LIMIT : CHANNEL_LIMIT
    if (count > limit) {
      res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' })
      return
    }

    next()
  }
}
