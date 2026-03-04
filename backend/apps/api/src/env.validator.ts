import { Logger } from '@nestjs/common'

export class EnvValidator {
  private static readonly REQUIRED_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'META_APP_SECRET',
    'PAYSTACK_SECRET_KEY',
  ] as const

  private static readonly OPTIONAL_VARS = [
    'META_WEBHOOK_VERIFY_TOKEN',
    'META_ACCESS_TOKEN',
    'META_PHONE_NUMBER_ID',
    'PAYMENT_CALLBACK_URL',
  ] as const

  private static readonly logger = new Logger('EnvValidator')

  static validate(): void {
    const missing: string[] = []

    for (const varName of this.REQUIRED_VARS) {
      if (!process.env[varName]) {
        missing.push(varName)
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    this.logger.log('✓ All required environment variables present')

    for (const varName of this.OPTIONAL_VARS) {
      if (!process.env[varName]) {
        this.logger.warn(`Optional variable ${varName} not set — some features may be disabled`)
      }
    }
  }

  static get(key: string): string {
    const value = process.env[key]
    if (!value) {
      throw new Error(`Environment variable ${key} is required but not set`)
    }
    return value
  }

  static getOptional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue
  }
}
