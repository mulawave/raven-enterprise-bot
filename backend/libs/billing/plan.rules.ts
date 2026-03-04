export type PlanType = 'FREE' | 'BASIC' | 'PRO'

export type PlanLimits = {
	messages: number
	orders: number
	bookings: number
	broadcasts: number
}

export const PLAN_RULES: Record<PlanType, PlanLimits> = {
	FREE: {
		messages: 1000,
		orders: 100,
		bookings: 100,
		broadcasts: 10
	},
	BASIC: {
		messages: 10000,
		orders: 1000,
		bookings: 1000,
		broadcasts: 100
	},
	PRO: {
		messages: 100000,
		orders: 10000,
		bookings: 10000,
		broadcasts: 1000
	}
}
