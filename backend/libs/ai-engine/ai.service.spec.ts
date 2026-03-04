import { AiService, ProcessInput, FallbackHandler } from './ai.service'
import { IntentRouter } from './intent.router'
import { StateMachine } from './state.machine'
import { RedisSessionStore } from './session.store'
import { AuditLogger } from '../monitoring/audit.logger'

describe('AiService', () => {
  let service: AiService
  let mockStore: jest.Mocked<Pick<RedisSessionStore, 'get' | 'set'>>
  let mockAuditLogger: jest.Mocked<Pick<AuditLogger, 'log'>>

  beforeEach(() => {
    mockStore = {
      get: jest.fn().mockResolvedValue({ state: 'Idle', lastIntent: null }),
      set: jest.fn().mockResolvedValue(undefined),
    }
    mockAuditLogger = {
      log: jest.fn().mockResolvedValue(undefined),
    }

    service = new AiService(
      new IntentRouter(),
      new StateMachine(),
      mockStore as unknown as RedisSessionStore,
      new FallbackHandler(),
      mockAuditLogger as unknown as AuditLogger,
    )
  })

  const baseInput: ProcessInput = {
    sessionId: 'sess-001',
    text: 'Hello there',
    tenantId: 'tenant-123',
    userId: 'user-456',
  }

  describe('processMessage()', () => {
    it('should route a greeting and return a Greeting intent', async () => {
      const result = await service.processMessage({ ...baseInput, text: 'Hi, good morning!' })
      expect(result.intent).toBe('Greeting')
      expect(result.text).toBeTruthy()
      expect(result.state).toBeDefined()
    })

    it('should route menu browse intent', async () => {
      const result = await service.processMessage({ ...baseInput, text: 'Show me the menu' })
      expect(result.intent).toBe('MenuBrowse')
    })

    it('should route escalation intent', async () => {
      const result = await service.processMessage({ ...baseInput, text: 'I need to speak to a human agent' })
      expect(result.intent).toBe('EscalationRequest')
    })

    it('should persist session after processing', async () => {
      await service.processMessage(baseInput)
      expect(mockStore.set).toHaveBeenCalledWith(
        'sess-001',
        expect.objectContaining({ lastIntent: expect.any(String) }),
      )
    })

    it('should write an audit log entry', async () => {
      await service.processMessage(baseInput)
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: expect.stringMatching(/^AI_INTENT:/) }),
      )
    })

    it('should throw AI_ACTION_FORBIDDEN when text contains explicit order confirmation', async () => {
      await expect(
        service.processMessage({ ...baseInput, text: 'confirming order now' }),
      ).rejects.toThrow('AI_ACTION_FORBIDDEN')
    })

    it('should include branding name in response when provided', async () => {
      const result = await service.processMessage({
        ...baseInput,
        text: 'Hi',
        brandingName: 'Café Raven',
      })
      expect(result.text).toContain('Café Raven')
    })
  })
})

