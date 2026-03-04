type CooldownKey = string

type CooldownConfig = {
  defaultCooldownMs: number
  perChannelCooldownMs?: Record<string, number>
}

export class ChannelCooldownTracker {
  private readonly lastSent = new Map<CooldownKey, number>()
  private readonly config: CooldownConfig

  constructor(config: CooldownConfig) {
    this.config = config
  }

  canSend(tenantId: string, channel: string, now = Date.now()): boolean {
    const key = this.key(tenantId, channel)
    const last = this.lastSent.get(key)
    if (!last) return true
    const cooldown = this.getCooldown(channel)
    return now - last >= cooldown
  }

  assertCanSend(tenantId: string, channel: string, now = Date.now()): void {
    if (!this.canSend(tenantId, channel, now)) {
      const error: any = new Error('BROADCAST_COOLDOWN_ACTIVE')
      error.code = 'BROADCAST_COOLDOWN_ACTIVE'
      error.tenantId = tenantId
      error.channel = channel
      throw error
    }
  }

  recordSend(tenantId: string, channel: string, now = Date.now()): void {
    const key = this.key(tenantId, channel)
    this.lastSent.set(key, now)
  }

  private getCooldown(channel: string): number {
    return this.config.perChannelCooldownMs?.[channel] ?? this.config.defaultCooldownMs
  }

  private key(tenantId: string, channel: string): CooldownKey {
    return `${tenantId}:${channel}`
  }
}
