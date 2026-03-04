import { Request, Response, NextFunction } from 'express'
import { PlanEnforcer } from './plan.enforcer'
import { PlanType } from './plan.rules'

export function billingGuard(type: 'messages' | 'orders' | 'bookings' | 'broadcasts') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const r = req as any
    const plan = (r.tenant?.plan ?? 'FREE') as PlanType
    const usage = r.tenant?.usage ?? { messages: 0, orders: 0, bookings: 0, broadcasts: 0 }
    try {
      new PlanEnforcer(plan, usage).check(type)
      next()
    } catch (e: unknown) {
      const err = e as { code?: string; plan?: string; limitType?: string }
      res.status(429).json({ error: err.code, plan: err.plan, type: err.limitType })
    }
  }
}
