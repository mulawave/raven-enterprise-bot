import { PrismaClient } from '@prisma/client'
import { Logger } from '@nestjs/common'

export class ConversationLogger {
  private readonly logger = new Logger('ConversationLogger')

  constructor(private readonly prisma: PrismaClient) {}

  async logDecision(
    tenantId: string,
    conversationId: string,
    userId: string | null,
    input: string,
    output: string,
    intent: string,
    state: string,
  ): Promise<void> {
    // Currently log-only (no DB persistence). If persisted conversation logging is needed,
    // add a ConversationLog model to Prisma schema and write records here.
    this.logger.log(
      `tenant=${tenantId} conversation=${conversationId} intent=${intent} state=${state}`,
    )
  }
}
