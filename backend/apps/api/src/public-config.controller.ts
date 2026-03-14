import { Controller, Get } from '@nestjs/common'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

/**
 * Returns a small allowlist of non-secret, publicly-safe config values
 * that the browser needs before the user is authenticated (e.g. reCAPTCHA
 * site key on the register / onboarding pages).
 *
 * ⚠️  Only add keys that are safe to expose to unauthenticated clients.
 *     Never put secrets, tokens, or private keys here.
 */
const PUBLIC_KEYS = ['RECAPTCHA_SITE_KEY'] as const

@Controller('api/config/public')
export class PublicConfigController {
  constructor(private readonly configLoader: ConfigLoaderService) {}

  @Get()
  async getPublicConfig(): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {}
    for (const key of PUBLIC_KEYS) {
      result[key] = (await this.configLoader.get(key)) ?? null
    }
    return result
  }
}
