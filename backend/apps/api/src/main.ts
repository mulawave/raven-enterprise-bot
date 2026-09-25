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

  // Instruct every proxy (nginx, CDN, browser) never to cache API responses.
  // All data must come from the database on every request — no stale reads.
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  // Public widget requests originate from verified customer domains, not from the
  // dashboard allowlist. Handle widget CORS explicitly without widening the rest
  // of the API surface.
  app.use((req: any, res: any, next: any) => {
    if (req.path?.startsWith('/widget/')) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Origin,Referer,X-Requested-With')
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }
    }
    next()
  })

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
