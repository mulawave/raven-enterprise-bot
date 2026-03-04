/**
 * InfrastructureModule — global module that provides the PrismaClient and Redis
 * singletons to every module in the application without the need to explicitly
 * import this module everywhere.
 *
 * The `prisma` and `redis` constants are exported so `AppModule.configure()` can
 * reference `redis` directly when building rate-limit middleware.
 */
import { Global, Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

export const prisma = new PrismaClient()
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

@Global()
@Module({
  providers: [
    { provide: PrismaClient, useValue: prisma },
    { provide: Redis, useValue: redis },
  ],
  exports: [PrismaClient, Redis],
})
export class InfrastructureModule {}
