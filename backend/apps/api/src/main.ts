import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(__dirname, '../../../../.env') })

import { initSentry } from '../../../libs/monitoring/sentry'
// Initialise Sentry before anything else so all errors are captured
initSentry()

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvValidator } from './env.validator'
import { ValidationPipe, Logger } from '@nestjs/common'
import * as express from 'express'
import { join } from 'path'
import helmet from 'helmet'
import { createUploadsAuthMiddleware } from './uploads-auth.middleware'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  // Validate environment variables on startup
  EnvValidator.validate()

  const app = await NestFactory.create(AppModule, { rawBody: true })

  // Security headers
  app.use(helmet())

  // Global validation pipe — strip unknown fields, enforce types
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  // Serve static files for uploads — gated by auth
  const jwtSecret = process.env.JWT_SECRET!
  app.use(
    '/uploads',
    createUploadsAuthMiddleware(jwtSecret),
    express.static(join(process.cwd(), 'uploads')),
  )

  // Restrict CORS to known frontend origins
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  const port = process.env.PORT || 4000
  await app.listen(port)

  logger.log(`🚀 Raven API listening on port ${port}`)
  logger.log(`✓ Health check: http://localhost:${port}/api/health`)
  logger.log(`✓ Readiness check: http://localhost:${port}/api/ready`)
  logger.log(`✓ Uploads served from: http://localhost:${port}/uploads`)

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received: closing HTTP server')
    await app.close()
    logger.log('HTTP server closed')
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received: closing HTTP server')
    await app.close()
    logger.log('HTTP server closed')
    process.exit(0)
  })
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Failed to start application', err)
  process.exit(1)
})
