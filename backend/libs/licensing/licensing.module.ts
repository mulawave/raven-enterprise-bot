import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { LicensingService } from './licensing.service'
import { LicensingController } from './licensing.controller'
import { LicensingAdminController } from './licensing-admin.controller'
import { LicensingGuard } from './licensing.guard'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [LicensingController, LicensingAdminController],
  providers: [LicensingService, LicensingGuard],
  exports: [LicensingService, LicensingGuard],
})
export class LicensingModule {}
