/**
 * AuthModule — authentication, authorisation, user management and branch/staff scoping.
 *
 * Exports all middleware classes so AppModule.configure() can apply them to routes.
 */
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

// Controllers
import { AdminAuthController } from '../admin/auth/admin-auth.controller'
import { AdminProfileController } from '../admin/profile/admin-profile.controller'
import { AdminUsersController } from '../admin/users/admin-users.controller'
import { TenantAuthController } from './tenant-auth.controller'

// Services
import { UserService } from '../../../libs/auth/services/user.service'
import { AuthService } from '../../../libs/auth/services/auth.service'
import { PlanService } from '../../../libs/auth/plan.service'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'
import { TenantMiddleware } from '../../../libs/auth/middleware/tenant.middleware'
import { BranchPermissionMiddleware } from '../../../libs/auth/permissions.guard'
import { BranchResolverMiddleware } from '../../../libs/tenant/branch.middleware'
import { BranchService } from '../../../libs/tenant/branch.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminAuthController, TenantAuthController, AdminProfileController, AdminUsersController],
  providers: [
    UserService,
    AuthService,
    PlanService,
    StaffScopeService,
    TenantMiddleware,
    BranchPermissionMiddleware,
    BranchResolverMiddleware,
    BranchService,
  ],
  exports: [
    JwtModule,
    UserService,
    AuthService,
    PlanService,
    StaffScopeService,
    TenantMiddleware,
    BranchPermissionMiddleware,
    BranchResolverMiddleware,
    BranchService,
  ],
})
export class AuthModule {}
