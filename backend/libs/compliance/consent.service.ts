import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ConsentTracker {
  constructor(private readonly prisma: PrismaClient) {}

  async recordConsent(userId: string, consentType: string): Promise<void> {
    await this.prisma.consent.create({ data: { user_id: userId, type: consentType } })
  }

  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    const entry = await this.prisma.consent.findFirst({ where: { user_id: userId, type: consentType } })
    return !!entry
  }
}
