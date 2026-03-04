import { MenuItemService } from './menu.service';
export interface CartItem {
    itemId: string;
    quantity: number;
}
export interface Cart {
    tenantId: string;
    customerId: string;
    items: CartItem[];
}
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown>;
    del(key: string): Promise<unknown>;
}
export declare class CartService {
    private readonly redis;
    private readonly menuItemService;
    private readonly prefix;
    private readonly ttlSeconds;
    constructor(redis: RedisClient, menuItemService: MenuItemService, ttlSeconds?: number);
    getCart(tenantId: string, customerId: string): Promise<Cart>;
    setCart(cart: Cart): Promise<void>;
    clearCart(tenantId: string, customerId: string): Promise<void>;
    private key;
}
