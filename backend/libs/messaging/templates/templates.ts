export type TemplateId =
  | 'order_confirmation'
  | 'booking_confirmation'
  | 'payment_failure'
  | 'suspension_notice'

export type OrderConfirmationPayload = {
  orderId: string
  totalKobo: number
  currency: string
}

export type BookingConfirmationPayload = {
  bookingId: string
  totalKobo: number
  currency: string
  startDate: string
  endDate: string
}

export type PaymentFailurePayload = {
  reference: string
  amountKobo: number
  currency: string
  reason: string
}

export type SuspensionNoticePayload = {
  effectiveDate: string
  reason: string
  supportEmail: string
}

export type TemplatePayloadMap = {
  order_confirmation: OrderConfirmationPayload
  booking_confirmation: BookingConfirmationPayload
  payment_failure: PaymentFailurePayload
  suspension_notice: SuspensionNoticePayload
}

export type TemplateRender = {
  subject: string
  body: string
}

export const templates: {
  [K in TemplateId]: (payload: TemplatePayloadMap[K], brandName: string) => TemplateRender
} = {
  order_confirmation: (payload, brandName) => ({
    subject: `${brandName} Order Confirmation`,
    body: `Your order ${payload.orderId} is confirmed. Total: ${formatMoney(payload.totalKobo, payload.currency)}.`
  }),
  booking_confirmation: (payload, brandName) => ({
    subject: `${brandName} Booking Confirmation`,
    body: `Your booking ${payload.bookingId} is confirmed for ${payload.startDate} to ${payload.endDate}. Total: ${formatMoney(payload.totalKobo, payload.currency)}.`
  }),
  payment_failure: (payload, brandName) => ({
    subject: `${brandName} Payment Failure`,
    body: `We could not process payment ${payload.reference}. Amount: ${formatMoney(payload.amountKobo, payload.currency)}. Reason: ${payload.reason}.`
  }),
  suspension_notice: (payload, brandName) => ({
    subject: `${brandName} Account Suspension`,
    body: `Your account is suspended effective ${payload.effectiveDate}. Reason: ${payload.reason}. Contact ${payload.supportEmail} for assistance.`
  })
}

export function formatMoney(amountKobo: number, currency: string): string {
  const amount = (amountKobo / 100).toFixed(2)
  return `${currency} ${amount}`
}