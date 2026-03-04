import { IntentRouter, Intent } from './intent.router';
import { StateMachine, ValidationState, ConversationState } from './state.machine';
import { RedisSessionStore } from './session.store';
import { AuditLogger } from '../monitoring/audit.logger';
export type UserRole = 'owner' | 'staff' | 'admin';
export interface ValidatedPayload {
    status: ValidationState;
    text?: string;
    draftCreated?: boolean;
}
export interface ProcessInput {
    sessionId: string;
    text: string;
    tenantId?: string | null;
    userId?: string | null;
    userRole?: UserRole;
    validated?: ValidatedPayload;
    brandingName?: string;
}
export interface ProcessOutput {
    text: string;
    state: ConversationState;
    intent: Intent;
}
export declare class FallbackHandler {
    getText(brandingName?: string): string;
}
export declare class AiService {
    private readonly router;
    private readonly stateMachine;
    private readonly store;
    private readonly fallback;
    private readonly auditLogger;
    constructor(router: IntentRouter, stateMachine: StateMachine, store: RedisSessionStore, fallback: FallbackHandler, auditLogger: AuditLogger);
    processMessage(input: ProcessInput): Promise<ProcessOutput>;
    private enforceAIFailSafes;
    private logViolation;
    private enforceIdentityRules;
}
