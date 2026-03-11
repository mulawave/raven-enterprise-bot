import * as jwt from 'jsonwebtoken'
import { rateLimitMiddleware } from './rate-limit.middleware'

describe('rateLimitMiddleware', () => {
  const redis = {
    incr: jest.fn(),
    expire: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-for-rate-limit-spec'
  })

  it('keys tenant rate limits off verified JWT tenant id instead of spoofed header values', async () => {
    const token = jwt.sign({ tenant_id: 'tenant-jwt' }, process.env.JWT_SECRET!)
    redis.incr.mockResolvedValue(1)
    redis.expire.mockResolvedValue(1)

    const middleware = rateLimitMiddleware(redis as any, 'tenant')
    const req: any = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': 'forged-tenant',
      },
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.1' },
    }
    const res: any = { status: jest.fn().mockReturnValue({ json: jest.fn() }) }
    const next = jest.fn()

    await middleware(req, res, next)

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:tenant:tenant-jwt')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('falls back to client IP when no valid JWT is present', async () => {
    redis.incr.mockResolvedValue(1)
    redis.expire.mockResolvedValue(1)

    const middleware = rateLimitMiddleware(redis as any, 'tenant')
    const req: any = {
      headers: {
        authorization: 'Bearer invalid-token',
        'x-tenant-id': 'forged-tenant',
      },
      ip: '10.0.0.2',
      socket: { remoteAddress: '10.0.0.2' },
    }
    const res: any = { status: jest.fn().mockReturnValue({ json: jest.fn() }) }
    const next = jest.fn()

    await middleware(req, res, next)

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:tenant:10.0.0.2')
    expect(next).toHaveBeenCalledTimes(1)
  })
})