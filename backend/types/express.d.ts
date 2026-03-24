// Express Request augmentation — shared across all backend projects
// Do NOT add top-level imports here (they turn the file into a module and break global augmentation)

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        scope: string
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
