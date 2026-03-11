import { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'
import * as jwt from 'jsonwebtoken'

const WINDOW_SECONDS = 60
const TENANT_LIMIT = 100
const CHANNEL_LIMIT = 50

/**
 * Returns an Express middleware that rate-limits requests using the provided
 * shared Redis instance (no extra connection opened).
 */
export function rateLimitMiddleware(redis: Redis, type: 'tenant' | 'channel') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    let verifiedTenantId: string | undefined

    if (bearerToken && process.env.JWT_SECRET) {
      try {
        const payload = jwt.verify(bearerToken, process.env.JWT_SECRET) as jwt.JwtPayload
        if (typeof payload.tenant_id === 'string' && payload.tenant_id.trim().length > 0) {
          verifiedTenantId = payload.tenant_id
        }
      } catch {
        verifiedTenantId = undefined
      }
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown'
    const key =
      type === 'tenant'
        ? `ratelimit:tenant:${verifiedTenantId || clientIp}`
        : `ratelimit:channel:${clientIp}`

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
