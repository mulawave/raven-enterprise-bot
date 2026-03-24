import { Module, Global } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { EmailService } from '../email/email.service'

/**
 * Global Notifications module — provides NotificationService to the entire app.
 * ConfigLoaderService is already globally available from AppConfigModule.
 */
@Global()
@Module({
  providers: [NotificationService, EmailService],
  exports: [NotificationService, EmailService],
})
export class NotificationsModule {}
