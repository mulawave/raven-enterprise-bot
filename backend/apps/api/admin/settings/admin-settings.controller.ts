import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Post } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { diskStorage } from 'multer'
import { extname } from 'path'

interface UpdateSettingsDto {
  company_name?: string
  company_address?: string
  company_email?: string
  company_phone?: string
}

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async getSettings() {
    let settings = await this.prisma.appSettings.findFirst()
    
    if (!settings) {
      settings = await this.prisma.appSettings.create({
        data: {},
      })
    }

    return settings
  }

  @Patch()
  async updateSettings(@Body() body: UpdateSettingsDto) {
    let settings = await this.prisma.appSettings.findFirst()

    if (!settings) {
      settings = await this.prisma.appSettings.create({ data: {} })
    }

    const updated = await this.prisma.appSettings.update({
      where: { id: settings.id },
      data: {
        company_name: body.company_name,
        company_address: body.company_address,
        company_email: body.company_email,
        company_phone: body.company_phone,
      },
    })

    return updated
  }

  @Post('upload/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/settings',
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|svg\+xml|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) {
      return { error: { code: 'NO_FILE', message: 'No file uploaded' } }
    }

    const logoUrl = `/uploads/settings/${file.filename}`

    let settings = await this.prisma.appSettings.findFirst()
    if (!settings) {
      settings = await this.prisma.appSettings.create({ data: {} })
    }

    const updated = await this.prisma.appSettings.update({
      where: { id: settings.id },
      data: { logo_url: logoUrl },
    })

    return { logo_url: updated.logo_url }
  }

  @Post('upload/favicon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/settings',
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `favicon-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|svg\+xml|webp|x-icon|vnd.microsoft.icon)$/)) {
          return cb(new Error('Only image/icon files are allowed'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadFavicon(@UploadedFile() file: any) {
    if (!file) {
      return { error: { code: 'NO_FILE', message: 'No file uploaded' } }
    }

    const faviconUrl = `/uploads/settings/${file.filename}`

    let settings = await this.prisma.appSettings.findFirst()
    if (!settings) {
      settings = await this.prisma.appSettings.create({ data: {} })
    }

    const updated = await this.prisma.appSettings.update({
      where: { id: settings.id },
      data: { favicon_url: faviconUrl },
    })

    return { favicon_url: updated.favicon_url }
  }
}
