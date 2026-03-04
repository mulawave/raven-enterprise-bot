import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Post, Request } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { diskStorage } from 'multer'
import { extname } from 'path'
import * as bcrypt from 'bcrypt'

interface UpdateProfileDto {
  name?: string
  email?: string
  password?: string
}

@Controller('admin/profile')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminProfileController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async getProfile(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub

    if (!userId) {
      return { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        scope: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!user) {
      return { error: { code: 'NOT_FOUND', message: 'User not found' } }
    }

    return user
  }

  @Patch()
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user?.id || req.user?.sub

    if (!userId) {
      return { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }
    }

    const updateData: any = {}

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.email !== undefined) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: body.email },
      })

      if (existingUser && existingUser.id !== userId) {
        return {
          error: {
            code: 'EMAIL_TAKEN',
            message: 'Email already in use by another user',
          },
        }
      }

      updateData.email = body.email
    }

    if (body.password !== undefined && body.password.length > 0) {
      const hashedPassword = await bcrypt.hash(body.password, 10)
      updateData.password = hashedPassword
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        scope: true,
        created_at: true,
        updated_at: true,
      },
    })

    return updated
  }

  @Post('upload/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadAvatar(@Request() req: any, @UploadedFile() file: any) {
    const userId = req.user?.id || req.user?.sub

    if (!userId) {
      return { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }
    }

    if (!file) {
      return { error: { code: 'NO_FILE', message: 'No file uploaded' } }
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar_url: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        scope: true,
        created_at: true,
        updated_at: true,
      },
    })

    return { avatar_url: updated.avatar_url, user: updated }
  }
}
