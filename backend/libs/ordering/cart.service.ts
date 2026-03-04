import { MenuItemService } from './menu.service'

export interface CartItem {
  itemId: string
  quantity: number
}

export interface Cart {
  tenantId: string
  customerId: string
  items: CartItem[]
}

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

export class CartService {
  private readonly prefix = 'cart:'
  private readonly ttlSeconds: number

  constructor(
    private readonly redis: RedisClient,
    private readonly menuItemService: MenuItemService,
    ttlSeconds = 3600,
  ) {
    this.ttlSeconds = ttlSeconds
  }

  async getCart(tenantId: string, customerId: string): Promise<Cart> {
    const raw = await this.redis.get(this.key(tenantId, customerId))
    if (!raw) return { tenantId, customerId, items: [] }
    const parsed = JSON.parse(raw) as Cart
    return { tenantId, customerId, items: parsed.items || [] }
  }

  async setCart(cart: Cart): Promise<void> {
    await this.redis.set(this.key(cart.tenantId, cart.customerId), JSON.stringify(cart), 'EX', this.ttlSeconds)
  }

  async clearCart(tenantId: string, customerId: string): Promise<void> {
    await this.redis.del(this.key(tenantId, customerId))
  }

  private key(tenantId: string, customerId: string): string {
    return `${this.prefix}${tenantId}:${customerId}`
  }
}
