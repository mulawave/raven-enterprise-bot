"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSessionStore = void 0;
class RedisSessionStore {
    constructor(redis, ttlSeconds = 3600) {
        this.redis = redis;
        this.prefix = 'ai-session:';
        this.ttlSeconds = ttlSeconds;
    }
    async get(sessionId) {
        const raw = await this.redis.get(this.key(sessionId));
        if (!raw) {
            const fallback = { state: 'Idle', lastIntent: null, tenantId: null, userId: null };
            await this.set(sessionId, fallback);
            return fallback;
        }
        try {
            const parsed = JSON.parse(raw);
            const hydrated = {
                state: parsed.state || 'Idle',
                lastIntent: parsed.lastIntent || null,
                tenantId: parsed.tenantId ?? null,
                userId: parsed.userId ?? null,
            };
            await this.set(sessionId, hydrated);
            return hydrated;
        }
        catch {
            const fallback = { state: 'Idle', lastIntent: null, tenantId: null, userId: null };
            await this.set(sessionId, fallback);
            return fallback;
        }
    }
    async set(sessionId, data) {
        const payload = JSON.stringify(data);
        await this.redis.set(this.key(sessionId), payload, 'EX', this.ttlSeconds);
    }
    key(sessionId) {
        return `${this.prefix}${sessionId}`;
    }
}
exports.RedisSessionStore = RedisSessionStore;
