import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { UserScope } from '@prisma/client'
import { KnowledgeController } from './knowledge.controller'

describe('KnowledgeController', () => {
  const prisma = {
    websiteAssistant: { findFirst: jest.fn() },
    websiteKnowledgeSource: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(async ({ data }: any) => ({ id: 'src-1', created_at: new Date(), pages_indexed: 0, is_enabled: true, ...data })),
      delete: jest.fn(),
    },
    knowledgeDocument: { findMany: jest.fn() },
    tenantFaq: { findMany: jest.fn().mockResolvedValue([]) },
    tenantBotConfig: { findUnique: jest.fn().mockResolvedValue(null) },
  }
  const indexService = { enqueue: jest.fn() }
  const configLoader = { get: jest.fn().mockResolvedValue(null) }
  const controller = new KnowledgeController(prisma as any, indexService as any, configLoader as any)

  const user = { scope: UserScope.TENANT, tenant_id: 'tenant-1' }
  const assistant = {
    id: 'as-1',
    tenant_id: 'tenant-1',
    name: 'Mama Put',
    domains: [
      { hostname: 'mamaput.ng', verification_status: 'verified' },
      { hostname: 'pending.ng', verification_status: 'pending' },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.websiteAssistant.findFirst.mockResolvedValue(assistant)
    prisma.websiteKnowledgeSource.count.mockResolvedValue(0)
    prisma.websiteKnowledgeSource.findFirst.mockResolvedValue(null)
  })

  it('requires a tenant user', async () => {
    await expect(controller.list({ scope: 'SYSTEM' }, 'as-1')).rejects.toThrow(UnauthorizedException)
  })

  it("does not reveal another tenant's assistant", async () => {
    prisma.websiteAssistant.findFirst.mockResolvedValue(null)
    await expect(controller.list(user, 'as-other')).rejects.toThrow(NotFoundException)
    expect(prisma.websiteAssistant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'as-other', tenant_id: 'tenant-1' } }))
  })

  it('queues a verified website for crawling', async () => {
    const result = await controller.addSource(user, 'as-1', { type: 'website', url: 'mamaput.ng/' })
    expect(prisma.websiteKnowledgeSource.create).toHaveBeenCalledWith({
      data: { source_type: 'website', source_label: 'mamaput.ng', source_url: 'https://mamaput.ng/', assistant_id: 'as-1', crawl_status: 'queued' },
    })
    expect(result).toMatchObject({ type: 'website', status: 'queued', url: 'https://mamaput.ng/' })
  })

  it.each([
    ['an unverified domain', 'https://pending.ng'],
    ['a domain the tenant does not own', 'https://competitor.ng'],
    ['a non-web scheme', 'ftp://mamaput.ng'],
  ])('rejects %s', async (_label, url) => {
    await expect(controller.addSource(user, 'as-1', { type: 'website', url })).rejects.toThrow(BadRequestException)
    expect(prisma.websiteKnowledgeSource.create).not.toHaveBeenCalled()
  })

  it('validates pasted text sources', async () => {
    await expect(controller.addSource(user, 'as-1', { type: 'text', label: 'Policy', text: 'too short' })).rejects.toThrow(BadRequestException)
    await expect(controller.addSource(user, 'as-1', { type: 'text', label: '', text: 'x'.repeat(50) })).rejects.toThrow(BadRequestException)
    await expect(controller.addSource(user, 'as-1', { type: 'text', label: 'Policy', text: 'Returns accepted within 7 days with a receipt.' })).resolves.toMatchObject({ type: 'text' })
  })

  it('caps the number of sources per assistant', async () => {
    prisma.websiteKnowledgeSource.count.mockResolvedValue(20)
    await expect(controller.addSource(user, 'as-1', { type: 'text', label: 'P', text: 'x'.repeat(50) })).rejects.toThrow(BadRequestException)
  })

  it('does not re-queue a source that is already crawling', async () => {
    prisma.websiteKnowledgeSource.findFirst.mockResolvedValue({ id: 'src-1', assistant_id: 'as-1', crawl_status: 'crawling' })
    await controller.refresh(user, 'as-1', 'src-1')
    expect(indexService.enqueue).not.toHaveBeenCalled()
  })

  it('re-queues a finished source on refresh', async () => {
    prisma.websiteKnowledgeSource.findFirst.mockResolvedValue({ id: 'src-1', assistant_id: 'as-1', crawl_status: 'ready' })
    const result = await controller.refresh(user, 'as-1', 'src-1')
    expect(indexService.enqueue).toHaveBeenCalledWith('src-1')
    expect(result.status).toBe('queued')
  })
})
