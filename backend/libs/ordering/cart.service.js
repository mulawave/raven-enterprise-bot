"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
class CartService {
    constructor(redis, menuItemService, ttlSeconds = 3600) {
        this.redis = redis;
        this.menuItemService = menuItemService;
        this.prefix = 'cart:';
        this.ttlSeconds = ttlSeconds;
    }
    async getCart(tenantId, customerId) {
        const raw = await this.redis.get(this.key(tenantId, customerId));
        if (!raw)
            return { tenantId, customerId, items: [] };
        const parsed = JSON.parse(raw);
        return { tenantId, customerId, items: parsed.items || [] };
    }
    async setCart(cart) {
        await this.redis.set(this.key(cart.tenantId, cart.customerId), JSON.stringify(cart), 'EX', this.ttlSeconds);
    }
    async clearCart(tenantId, customerId) {
        await this.redis.del(this.key(tenantId, customerId));
    }
    key(tenantId, customerId) {
        return `${this.prefix}${tenantId}:${customerId}`;
    }
}
exports.CartService = CartService;
