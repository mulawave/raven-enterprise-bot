import { User, UserRole, UserScope } from '@prisma/client'

/**
 * Extend Express Request with fields injected by NestJS middleware/guards
 * (TenantMiddleware, JwtAuthGuard, BranchResolver).
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: UserRole
        scope: UserScope
        tenant_id?: string | null
        name?: string | null
      }
      tenant_id?: string | null
      branchId?: string
      tenant?: {
        id: string
        plan: string
        usage: {
          messages: number
          orders: number
          bookings: number
          broadcasts: number
        }
      }
    }
  }
}

export {}
