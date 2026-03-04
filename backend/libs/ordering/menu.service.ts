import { PrismaClient, MenuCategory, MenuItem } from '@prisma/client'

export class MenuCategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCategories(tenantId: string): Promise<MenuCategory[]> {
    return this.prisma.menuCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    })
  }
}

export class MenuItemService {
  constructor(private readonly prisma: PrismaClient) {}

  async getItems(tenantId: string, categoryId?: string): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany({
      where: {
        tenant_id: tenantId,
        ...(categoryId && { category_id: categoryId }),
      },
      orderBy: { created_at: 'asc' },
    })
  }

  async getItemById(tenantId: string, itemId: string): Promise<MenuItem | null> {
    return this.prisma.menuItem.findFirst({
      where: { tenant_id: tenantId, id: itemId },
    })
  }
}
