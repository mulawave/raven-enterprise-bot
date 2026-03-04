import { PLAN_RULES, PlanType } from './plan.rules'

type UsageType = 'messages' | 'orders' | 'bookings' | 'broadcasts'

export class PlanEnforcer {
	constructor(private readonly plan: PlanType, private readonly usage: Record<UsageType, number>) {}

	check(type: UsageType): void {
		const limit = PLAN_RULES[this.plan][type]
		const used = this.usage[type] || 0
		if (used >= limit) {
			const error: any = new Error('PLAN_LIMIT_EXCEEDED')
			error.code = 'PLAN_LIMIT_EXCEEDED'
			error.plan = this.plan
			error.limitType = type
			throw error
		}
	}
}
