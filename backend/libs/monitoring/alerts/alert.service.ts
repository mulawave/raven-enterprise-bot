import { Logger } from '@nestjs/common'
import { ALERT_RULES } from './alert.rules'

export class AlertService {
  private readonly logger = new Logger('AlertService')
  private events: Record<string, { timestamp: number }[]> = {}

  record(event: string) {
    const now = Date.now()
    if (!this.events[event]) this.events[event] = []
    this.events[event].push({ timestamp: now })
    this.cleanup(event)
    if (this.shouldAlert(event)) {
      this.sendAlert(event)
    }
  }

  private cleanup(event: string) {
    const windowMs = (ALERT_RULES[event as keyof typeof ALERT_RULES]?.windowMinutes || 5) * 60 * 1000
    const cutoff = Date.now() - windowMs
    this.events[event] = (this.events[event] || []).filter(e => e.timestamp >= cutoff)
  }

  private shouldAlert(event: string) {
    const rule = ALERT_RULES[event as keyof typeof ALERT_RULES]
    if (!rule) return false
    return (this.events[event]?.length || 0) >= rule.threshold
  }

  private sendAlert(event: string) {
    this.logger.error(`${event} threshold exceeded`)
  }
}
