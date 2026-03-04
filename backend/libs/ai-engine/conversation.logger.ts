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
    // TODO: Add ConversationLog table to schema if conversation logging is needed
    this.logger.log(
      `tenant=${tenantId} conversation=${conversationId} intent=${intent} state=${state}`,
    )
  }
}
