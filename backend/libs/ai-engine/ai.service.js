"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = exports.FallbackHandler = void 0;
const prompts_1 = require("./prompts");
class FallbackHandler {
    getText(brandingName) {
        if (brandingName) {
            return `Welcome to ${brandingName}! ${prompts_1.FALLBACK_TEXT}`;
        }
        return prompts_1.FALLBACK_TEXT;
    }
}
exports.FallbackHandler = FallbackHandler;
class AiService {
    constructor(router, stateMachine, store, fallback, auditLogger) {
        this.router = router;
        this.stateMachine = stateMachine;
        this.store = store;
        this.fallback = fallback;
        this.auditLogger = auditLogger;
    }
    async processMessage(input) {
        this.enforceIdentityRules(input);
        this.enforceAIFailSafes(input);
        await this.auditLogger.log({
            tenant_id: input.tenantId || '',
            entity_id: input.sessionId,
            action: 'AI_INTENT',
            timestamp: new Date(),
        });
        await this.store.set(input.sessionId, {
            state: 'Idle',
            lastIntent: 'Fallback',
            tenantId: input.tenantId ?? null,
            userId: input.userId ?? null,
        });
        return {
            text: this.fallback.getText(input.brandingName),
            state: 'Idle',
            intent: 'Fallback',
        };
    }
    enforceAIFailSafes(input) {
        const { text, tenantId } = input;
        const forbidden = [/confirm(ing)?/i, /price/i, /availability/i];
        for (const pattern of forbidden) {
            if (pattern.test(text)) {
                this.logViolation(tenantId, text);
                throw new Error('AI_ACTION_FORBIDDEN');
            }
        }
    }
    logViolation(tenantId, text) {
        console.error(`[AI_FAILSAFE] tenant_id=${tenantId} text="${text}"`);
    }
    enforceIdentityRules(input) {
        if (input.userRole === 'admin')
            return;
        if (input.userRole === 'staff' || input.userRole === 'owner') {
            if (!input.tenantId) {
                throw new Error('Tenant required');
            }
        }
    }
}
exports.AiService = AiService;
