export const ALERT_RULES = {
  PAYMENT_FAILURE: {
    threshold: 1,
    windowMinutes: 5,
  },
  AI_FALLBACK_SPIKE: {
    threshold: 10,
    windowMinutes: 5,
  },
  MESSAGE_DELIVERY_FAILURE: {
    threshold: 3,
    windowMinutes: 5,
  },
  WEBHOOK_VERIFICATION_FAILURE: {
    threshold: 1,
    windowMinutes: 5,
  },
}
