import type { Intent } from './intent.router'

export type ConversationState =
  | 'Idle'
  | 'CollectingInfo'
  | 'DraftCreated'
  | 'AwaitingBackendValidation'
  | 'Validated'
  | 'RequiresStaffAction'
  | 'Closed'

export type ValidationState = 'Unknown' | 'ConfirmedByBackend' | 'NotFound' | 'Conflict'

export class StateMachine {
  transition(
    current: ConversationState,
    intent: Intent,
    validation: ValidationState,
    hasDraft: boolean,
  ): ConversationState {
    if (intent === 'EscalationRequest') return 'RequiresStaffAction'

    if (intent === 'Greeting' || intent === 'HelpRequest') return 'Validated'

    // Informational intents — no backend validation needed, answer immediately
    if (
      intent === 'GeneralInfo' ||
      intent === 'MenuBrowse' ||
      intent === 'AboutInquiry' ||
      intent === 'PriceInquiry' ||
      intent === 'AvailabilityInquiry' ||
      intent === 'PolicyQuestion' ||
      intent === 'Fallback'
    ) {
      return 'Validated'
    }

    if (intent === 'OrderDraft' || intent === 'ModifyOrderDraft' || intent === 'BookingRequest') {
      if (hasDraft) return this.applyValidation('DraftCreated', validation)
      return this.applyValidation('CollectingInfo', validation)
    }

    return this.applyValidation('CollectingInfo', validation)
  }

  private applyValidation(base: ConversationState, validation: ValidationState): ConversationState {
    if (validation === 'Unknown') return 'AwaitingBackendValidation'
    if (validation === 'ConfirmedByBackend') return 'Validated'
    return 'RequiresStaffAction'
  }
}
