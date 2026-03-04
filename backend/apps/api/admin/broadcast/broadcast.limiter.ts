type RateWindow = {
  limit: number
  windowMs: number
}

type TenantLimits = {
  perTenant: RateWindow
  perChannel: Record<string, RateWindow>
}

type WindowState = { count: number; resetAt: number }

type LimitKey = string

export class BroadcastLimiter {
  private readonly tenantLimits: TenantLimits
  private readonly windows = new Map<LimitKey, WindowState>()

  constructor(tenantLimits: TenantLimits) {
    this.tenantLimits = tenantLimits
  }

  assertCanSend(tenantId: string, channel: string, now = Date.now()): void {
    this.checkWindow(this.tenantKey(tenantId), this.tenantLimits.perTenant, tenantId, channel, now)
    const channelLimit = this.tenantLimits.perChannel[channel]
    if (channelLimit) {
      this.checkWindow(this.channelKey(tenantId, channel), channelLimit, tenantId, channel, now)
    }
  }

  recordSend(tenantId: string, channel: string, now = Date.now()): void {
    this.incrementWindow(this.tenantKey(tenantId), this.tenantLimits.perTenant, now)
    const channelLimit = this.tenantLimits.perChannel[channel]
    if (channelLimit) {
      this.incrementWindow(this.channelKey(tenantId, channel), channelLimit, now)
    }
  }

  private checkWindow(key: LimitKey, window: RateWindow, tenantId: string, channel: string, now: number): void {
    const state = this.getWindowState(key, window, now)
    if (state.count >= window.limit) {
      const error: any = new Error('BROADCAST_RATE_LIMIT')
      error.code = 'BROADCAST_RATE_LIMIT'
      error.tenantId = tenantId
      error.channel = channel
      error.retryAt = state.resetAt
      throw error
    }
  }

  private incrementWindow(key: LimitKey, window: RateWindow, now: number): void {
    const state = this.getWindowState(key, window, now)
    state.count += 1
    this.windows.set(key, state)
  }

  private getWindowState(key: LimitKey, window: RateWindow, now: number): WindowState {
    const state = this.windows.get(key)
    if (!state || now >= state.resetAt) {
      return { count: 0, resetAt: now + window.windowMs }
    }
    return state
  }

  private tenantKey(tenantId: string): LimitKey {
    return `tenant:${tenantId}`
  }

  private channelKey(tenantId: string, channel: string): LimitKey {
    return `channel:${tenantId}:${channel}`
  }
}
