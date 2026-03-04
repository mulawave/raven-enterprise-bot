import type { BrandingConfig } from '../tenant/branding/branding.service'
import { brandingKey, featureFlagsKey, menuItemsKey, roomTypesKey } from './cache.keys'

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

export type MenuItemCache = {
  id: string
  tenant_id: string
  category_id: string
  name: string
  description?: string | null
  available: boolean
  created_at?: string
  updated_at?: string
}

export type RoomTypeCache = {
  id: string
  tenant_id: string
  name: string
  description?: string | null
  created_at?: string
  updated_at?: string
}

export class CacheService {
  private readonly ttlMenuItems = 300
  private readonly ttlRoomTypes = 300
  private readonly ttlBranding = 600
  private readonly ttlFeatureFlags = 120

  constructor(private readonly redis: RedisClient) {}

  async getMenuItems(tenantId: string): Promise<MenuItemCache[] | null> {
    const raw = await this.redis.get(menuItemsKey(tenantId))
    if (!raw) return null
    return JSON.parse(raw) as MenuItemCache[]
  }

  async setMenuItems(tenantId: string, items: MenuItemCache[]): Promise<void> {
    const safe = items.map(this.stripMoneyFromMenuItem)
    await this.redis.set(menuItemsKey(tenantId), JSON.stringify(safe), 'EX', this.ttlMenuItems)
  }

  async invalidateMenuItems(tenantId: string): Promise<void> {
    await this.redis.del(menuItemsKey(tenantId))
  }

  async getRoomTypes(tenantId: string): Promise<RoomTypeCache[] | null> {
    const raw = await this.redis.get(roomTypesKey(tenantId))
    if (!raw) return null
    return JSON.parse(raw) as RoomTypeCache[]
  }

  async setRoomTypes(tenantId: string, rooms: RoomTypeCache[]): Promise<void> {
    const safe = rooms.map(this.stripMoneyFromRoomType)
    await this.redis.set(roomTypesKey(tenantId), JSON.stringify(safe), 'EX', this.ttlRoomTypes)
  }

  async invalidateRoomTypes(tenantId: string): Promise<void> {
    await this.redis.del(roomTypesKey(tenantId))
  }

  async getBranding(tenantId: string): Promise<BrandingConfig | null> {
    const raw = await this.redis.get(brandingKey(tenantId))
    if (!raw) return null
    return JSON.parse(raw) as BrandingConfig
  }

  async setBranding(tenantId: string, branding: BrandingConfig): Promise<void> {
    await this.redis.set(brandingKey(tenantId), JSON.stringify(branding), 'EX', this.ttlBranding)
  }

  async invalidateBranding(tenantId: string): Promise<void> {
    await this.redis.del(brandingKey(tenantId))
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, boolean> | null> {
    const raw = await this.redis.get(featureFlagsKey(tenantId))
    if (!raw) return null
    return JSON.parse(raw) as Record<string, boolean>
  }

  async setFeatureFlags(tenantId: string, flags: Record<string, boolean>): Promise<void> {
    await this.redis.set(featureFlagsKey(tenantId), JSON.stringify(flags), 'EX', this.ttlFeatureFlags)
  }

  async invalidateFeatureFlags(tenantId: string): Promise<void> {
    await this.redis.del(featureFlagsKey(tenantId))
  }

  private stripMoneyFromMenuItem(item: MenuItemCache): MenuItemCache {
    const { id, tenant_id, category_id, name, description, available, created_at, updated_at } = item
    return { id, tenant_id, category_id, name, description, available, created_at, updated_at }
  }

  private stripMoneyFromRoomType(room: RoomTypeCache): RoomTypeCache {
    const { id, tenant_id, name, description, created_at, updated_at } = room
    return { id, tenant_id, name, description, created_at, updated_at }
  }
}
