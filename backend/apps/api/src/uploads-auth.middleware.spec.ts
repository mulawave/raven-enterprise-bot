import * as jwt from 'jsonwebtoken'
import { createUploadsAuthMiddleware } from './uploads-auth.middleware'

describe('createUploadsAuthMiddleware', () => {
  const jwtSecret = 'test-upload-secret'

  const createResponse = () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    return { status, json }
  }

  it('allows public branding assets under /uploads/settings', () => {
    const middleware = createUploadsAuthMiddleware(jwtSecret)
    const req: any = { path: '/settings/logo.png', headers: {} }
    const res = createResponse()
    const next = jest.fn()

    middleware(req, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects forged x-tenant-id and query token access to protected uploads', () => {
    const middleware = createUploadsAuthMiddleware(jwtSecret)
    const req: any = {
      path: '/avatars/user.png',
      headers: { 'x-tenant-id': 'forged-tenant' },
      query: { t: 'forged-token' },
    }
    const res = createResponse()
    const next = jest.fn()

    middleware(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('allows protected uploads when a valid bearer token is present', () => {
    const token = jwt.sign({ sub: 'user-1' }, jwtSecret)
    const middleware = createUploadsAuthMiddleware(jwtSecret)
    const req: any = {
      path: '/avatars/user.png',
      headers: { authorization: `Bearer ${token}` },
    }
    const res = createResponse()
    const next = jest.fn()

    middleware(req, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})