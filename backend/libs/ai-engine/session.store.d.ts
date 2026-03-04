import type { ConversationState } from './state.machine';
import type { Intent } from './intent.router';
export interface SessionData {
    state: ConversationState;
    lastIntent: Intent | null;
    tenantId: string | null;
    userId: string | null;
}
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown>;
}
export declare class RedisSessionStore {
    private readonly redis;
    private readonly prefix;
    private readonly ttlSeconds;
    constructor(redis: RedisClient, ttlSeconds?: number);
    get(sessionId: string): Promise<SessionData>;
    set(sessionId: string, data: SessionData): Promise<void>;
    private key;
}
