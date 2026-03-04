import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaClient, UserRole, UserScope } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'

interface CreateAdminUserDto {
  email: string
  password: string
  name?: string
  role?: 'SUPER_ADMIN' | 'admin'
}

interface UpdateAdminUserDto {
  name?: string
  email?: string
  password?: string
  role?: 'SUPER_ADMIN' | 'admin'
}

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  scope: true,
  avatar_url: true,
  created_at: true,
  updated_at: true,
  tenant_id: true,
} as const

@Controller('admin/users')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /admin/users
   * List all admin-scope users (SYSTEM scope) with optional role filter
   */
  @Get()
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: any = {
      scope: UserScope.SYSTEM,
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  }

  /**
   * GET /admin/users/:id
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, scope: UserScope.SYSTEM },
      select: SAFE_SELECT,
    })

    if (!user) throw new NotFoundException('Admin user not found')
    return user
  }

  /**
   * POST /admin/users
   * Create a new SYSTEM-scope admin user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() body: CreateAdminUserDto) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required')
    }

    if (body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters')
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    })
    if (existing) throw new ConflictException('Email already in use')

    const role = body.role === 'admin' ? UserRole.admin : UserRole.SUPER_ADMIN
    const hashedPassword = await bcrypt.hash(body.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name ?? null,
        role,
        scope: UserScope.SYSTEM,
        tenant_id: null,
      },
      select: SAFE_SELECT,
    })

    return user
  }

  /**
   * PATCH /admin/users/:id
   */
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateAdminUserDto,
    @Request() req: any,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, scope: UserScope.SYSTEM },
    })
    if (!existing) throw new NotFoundException('Admin user not found')

    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name

    if (body.email !== undefined) {
      const taken = await this.prisma.user.findUnique({
        where: { email: body.email },
      })
      if (taken && taken.id !== id) {
        throw new ConflictException('Email already in use')
      }
      updateData.email = body.email
    }

    if (body.password !== undefined) {
      if (body.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters')
      }
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    if (body.role !== undefined) {
      const requesterId = req.user?.id || req.user?.sub
      // Prevent a user from downgrading their own role
      if (id === requesterId) {
        throw new ForbiddenException('Cannot change your own role')
      }
      updateData.role = body.role === 'admin' ? UserRole.admin : UserRole.SUPER_ADMIN
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: SAFE_SELECT,
    })

    return updated
  }

  /**
   * DELETE /admin/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    const requesterId = req.user?.id || req.user?.sub

    if (id === requesterId) {
      throw new ForbiddenException('Cannot delete your own account')
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, scope: UserScope.SYSTEM },
    })
    if (!existing) throw new NotFoundException('Admin user not found')

    // Ensure at least one SUPER_ADMIN remains
    if (existing.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, scope: UserScope.SYSTEM },
      })
      if (superAdminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last SUPER_ADMIN')
      }
    }

    await this.prisma.user.delete({ where: { id } })
    return { success: true, message: 'Admin user deleted' }
  }
}
