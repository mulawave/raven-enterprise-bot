import { Module, Global } from '@nestjs/common'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

/**
 * Global config module — inject ConfigLoaderService anywhere in the app
 * to read API keys from the DB (with env var fallback).
 */
@Global()
@Module({
  providers: [ConfigLoaderService],
  exports: [ConfigLoaderService],
})
export class AppConfigModule {}
