import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(__dirname, '../../../.env') })

import { initSentry } from '../../libs/monitoring/sentry'
initSentry()

import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { WorkerModule } from './worker.module'

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap')

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error'],
  })

  logger.log('🔧 Raven Worker process started')
  logger.log('  → AI message processor: ACTIVE')
  logger.log('  → Outbound message worker: ACTIVE')

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received: shutting down worker`)
    await app.close()
    logger.log('Worker shut down cleanly')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  new Logger('WorkerBootstrap').error('Failed to start worker', err)
  process.exit(1)
})
