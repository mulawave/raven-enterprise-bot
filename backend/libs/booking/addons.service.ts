import { PrismaClient } from '@prisma/client'

export class AddOnService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAddOns(tenantId: string): Promise<any[]> {
    // AddOn model not in schema yet, stub for now
    return []
  }

  async getAddOnById(tenantId: string, addOnId: string): Promise<any | null> {
    return null
  }
}
