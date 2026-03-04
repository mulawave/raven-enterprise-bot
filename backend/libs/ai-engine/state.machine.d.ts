import type { Intent } from './intent.router';
export type ConversationState = 'Idle' | 'CollectingInfo' | 'DraftCreated' | 'AwaitingBackendValidation' | 'Validated' | 'RequiresStaffAction' | 'Closed';
export type ValidationState = 'Unknown' | 'ConfirmedByBackend' | 'NotFound' | 'Conflict';
export declare class StateMachine {
    transition(current: ConversationState, intent: Intent, validation: ValidationState, hasDraft: boolean): ConversationState;
    private applyValidation;
}
