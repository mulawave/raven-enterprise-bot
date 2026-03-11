import { BranchResolverMiddleware } from './branch.middleware'

describe('BranchResolverMiddleware', () => {
  const createResponse = () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    return { status, json }
  }

  it('skips branch resolution when there is no verified tenant context', async () => {
    const branchService = {
      getBranch: jest.fn(),
      getDefaultBranch: jest.fn(),
    }
    const middleware = new BranchResolverMiddleware(branchService as any)
    const req: any = { headers: {} }
    const res = createResponse()
    const next = jest.fn()

    await middleware.use(req, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(branchService.getBranch).not.toHaveBeenCalled()
    expect(branchService.getDefaultBranch).not.toHaveBeenCalled()
    expect(req.branchId).toBeUndefined()
  })

  it('rejects an invalid explicit branch id', async () => {
    const branchService = {
      getBranch: jest.fn().mockResolvedValue(null),
      getDefaultBranch: jest.fn(),
    }
    const middleware = new BranchResolverMiddleware(branchService as any)
    const req: any = {
      tenant_id: 'tenant-1',
      headers: { 'x-branch-id': 'branch-x' },
    }
    const res = createResponse()
    const next = jest.fn()

    await middleware.use(req, res as any, next)

    expect(branchService.getBranch).toHaveBeenCalledWith('tenant-1', 'branch-x')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('uses an existing default branch without creating one', async () => {
    const branchService = {
      getBranch: jest.fn(),
      getDefaultBranch: jest.fn().mockResolvedValue({ id: 'branch-default' }),
      getOrCreateDefaultBranch: jest.fn(),
    }
    const middleware = new BranchResolverMiddleware(branchService as any)
    const req: any = {
      user: { tenant_id: 'tenant-1' },
      headers: {},
    }
    const res = createResponse()
    const next = jest.fn()

    await middleware.use(req, res as any, next)

    expect(branchService.getDefaultBranch).toHaveBeenCalledWith('tenant-1')
    expect(branchService.getOrCreateDefaultBranch).not.toHaveBeenCalled()
    expect(req.branchId).toBe('branch-default')
    expect(next).toHaveBeenCalledTimes(1)
  })
})