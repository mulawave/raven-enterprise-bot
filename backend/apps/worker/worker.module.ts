import { Module, OnApplicationShutdown } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { AiMessageProcessor } from './messaging/ai-message.processor'
import { NotificationService } from '../../libs/notifications/notification.service'
import { ConfigLoaderService } from '../../libs/config/config-loader.service'
import { EmailService } from '../../libs/email/email.service'
import { LicenseVerifyWorker } from './licensing/license-verify.worker'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

@Module({
  providers: [
    { provide: PrismaClient, useValue: prisma },
    { provide: Redis, useValue: redis },
    ConfigLoaderService,
    EmailService,
    NotificationService,
    AiMessageProcessor,
    LicenseVerifyWorker,
  ],
})
export class WorkerModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await prisma.$disconnect()
    await redis.quit()
  }
}
