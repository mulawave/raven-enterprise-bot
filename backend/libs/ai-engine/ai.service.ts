import { Logger } from '@nestjs/common'
import { IntentRouter, Intent } from './intent.router'
import { StateMachine, ValidationState, ConversationState } from './state.machine'
import { RedisSessionStore } from './session.store'
import { FALLBACK_TEXT } from './prompts'
import { AuditLogger } from '../monitoring/audit.logger'

export type UserRole = 'owner' | 'staff' | 'admin'

export interface ValidatedPayload {
  status: ValidationState
  text?: string
  draftCreated?: boolean
}

export interface ProcessInput {
  sessionId: string
  text: string
  tenantId?: string | null
  userId?: string | null
  userRole?: UserRole
  validated?: ValidatedPayload
  brandingName?: string  // NEW: Tenant business name for AI responses
}

export interface ProcessOutput {
  text: string
  state: ConversationState
  intent: Intent
}

export class FallbackHandler {
  getText(brandingName?: string): string {
    if (brandingName) {
      return `Welcome to ${brandingName}! ${FALLBACK_TEXT}`
    }
    return FALLBACK_TEXT
  }
}

export class AiService {
  private readonly logger = new Logger('AiService')

  constructor(
    private readonly router: IntentRouter,
    private readonly stateMachine: StateMachine,
    private readonly store: RedisSessionStore,
    private readonly fallback: FallbackHandler,
    private readonly auditLogger: AuditLogger,
  ) {}

  async processMessage(input: ProcessInput): Promise<ProcessOutput> {
    this.enforceIdentityRules(input)
    this.enforceAIFailSafes(input)

    // 1. Load session state from Redis
    const session = await this.store.get(input.sessionId)

    // 2. Route intent from message text
    const { intent } = this.router.route(input.text)

    // 3. Has a draft been created in this session?
    const hasDraft = session.state === 'DraftCreated'

    // 4. Transition conversation state
    const validation = input.validated?.status ?? 'Unknown'
    const nextState = this.stateMachine.transition(session.state, intent, validation, hasDraft)

    // 5. Persist updated session
    await this.store.set(input.sessionId, {
      state: nextState,
      lastIntent: intent,
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
    })

    // 6. Audit log
    await this.auditLogger.log({
      tenant_id: input.tenantId ?? '',
      entity_id: input.sessionId,
      action: `AI_INTENT:${intent}`,
      timestamp: new Date(),
    })

    // 7. Build response text
    const text = this.buildResponse(intent, nextState, input.brandingName)

    return { text, state: nextState, intent }
  }

  private buildResponse(intent: Intent, state: ConversationState, brandingName?: string): string {
    const brand = brandingName ? `${brandingName} — ` : ''

    if (state === 'RequiresStaffAction') {
      return `${brand}I will notify our team to follow up with you shortly.`
    }
    if (state === 'AwaitingBackendValidation') {
      return `${brand}Let me verify that for you and get back to you.`
    }

    switch (intent) {
      case 'Greeting':
        return `${brand}Hello! How can I help you today?`
      case 'HelpRequest':
        return `${brand}I can help with orders, bookings, payments, and general enquiries. What do you need?`
      case 'MenuBrowse':
        return `${brand}I can show you our available items. Please give me a moment.`
      case 'OrderDraft':
        return `${brand}I have started an order for you. Please confirm the items you would like.`
      case 'ModifyOrderDraft':
        return `${brand}I can update your order. Please let me know what you would like to change.`
      case 'BookingRequest':
        return `${brand}I will help with your booking. Please share your preferred date and room type.`
      case 'PaymentStatusInquiry':
        return `${brand}Let me check your payment status. Please share your reference number.`
      case 'PolicyQuestion':
        return `${brand}Our team will confirm the policy details for you shortly.`
      case 'EscalationRequest':
        return `${brand}A member of staff has been notified and will be with you shortly.`
      default:
        return this.fallback.getText(brandingName)
    }
  }

  private enforceAIFailSafes(input: ProcessInput): void {
    const { text, tenantId } = input
    // Block only explicit confirmations / price-setting — not simple enquiries
    const forbidden = [/\bconfirm(?:ing|ed)?\s+(?:order|booking|payment)/i, /set\s+price\b/i]
    for (const pattern of forbidden) {
      if (pattern.test(text)) {
        this.logViolation(tenantId, text)
        throw new Error('AI_ACTION_FORBIDDEN')
      }
    }
  }

  private logViolation(tenantId: string | null | undefined, text: string): void {
    console.error(`[AI_FAILSAFE] tenant_id=${tenantId} text="${text}"`)
  }

  private enforceIdentityRules(input: ProcessInput): void {
    if (input.userRole === 'admin') return
    if (input.userRole === 'staff' || input.userRole === 'owner') {
      if (!input.tenantId) {
        throw new Error('Tenant required')
      }
    }
  }
}
