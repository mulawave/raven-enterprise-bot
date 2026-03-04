export type Intent =
  | 'Greeting'
  | 'HelpRequest'
  | 'MenuBrowse'
  | 'PriceInquiry'
  | 'AvailabilityInquiry'
  | 'OrderDraft'
  | 'ModifyOrderDraft'
  | 'BookingRequest'
  | 'PaymentStatusInquiry'
  | 'PolicyQuestion'
  | 'EscalationRequest'
  | 'GeneralInfo'
  | 'Fallback'

export interface IntentRoute {
  intent: Intent
}

export class IntentRouter {
  route(text: string): IntentRoute {
    const t = text.toLowerCase()

    if (this.matches(t, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
      return { intent: 'Greeting' }
    }

    if (this.matches(t, ['help', 'how do i', 'can you help', 'what can you do', 'assist'])) {
      return { intent: 'HelpRequest' }
    }

    if (this.matches(t, ['menu', 'categories', 'items', 'dish', 'food', 'drink', 'beverage'])) {
      return { intent: 'MenuBrowse' }
    }

    if (this.matches(t, ['price', 'cost', 'how much', 'rate', 'fee'])) {
      return { intent: 'PriceInquiry' }
    }

    if (this.matches(t, ['available', 'availability', 'in stock', 'vacancy', 'free', 'open'])) {
      return { intent: 'AvailabilityInquiry' }
    }

    if (this.matches(t, ['order', 'place order', 'buy', 'purchase', 'add to order'])) {
      return { intent: 'OrderDraft' }
    }

    if (this.matches(t, ['change order', 'update order', 'modify order', 'remove item', 'add item'])) {
      return { intent: 'ModifyOrderDraft' }
    }

    if (this.matches(t, ['book', 'booking', 'reserve', 'reservation', 'room'])) {
      return { intent: 'BookingRequest' }
    }

    if (this.matches(t, ['payment status', 'paid', 'payment', 'receipt', 'reference'])) {
      return { intent: 'PaymentStatusInquiry' }
    }

    if (this.matches(t, ['policy', 'refund', 'cancellation', 'hours', 'opening', 'closing', 'terms'])) {
      return { intent: 'PolicyQuestion' }
    }

    if (this.matches(t, ['agent', 'staff', 'human', 'call me', 'contact', 'support'])) {
      return { intent: 'EscalationRequest' }
    }

    return { intent: 'GeneralInfo' }
  }

  private matches(text: string, keywords: string[]): boolean {
    for (const k of keywords) {
      if (text.includes(k)) return true
    }
    return false
  }
}
