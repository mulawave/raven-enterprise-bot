import { PrismaClient, MenuCategory, MenuItem } from '@prisma/client'

export class MenuCategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCategories(tenantId: string): Promise<MenuCategory[]> {
    return this.prisma.menuCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    })
  }

  async createCategory(tenantId: string, body: { name: string }): Promise<MenuCategory> {
    return this.prisma.menuCategory.create({
      data: {
        tenant_id: tenantId,
        name: body.name.trim(),
      },
    })
  }

  async updateCategory(tenantId: string, id: string, body: { name: string }): Promise<MenuCategory> {
    const existing = await this.prisma.menuCategory.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) throw new Error('Category not found')
    return this.prisma.menuCategory.update({
      where: { id },
      data: { name: body.name.trim() },
    })
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.menuCategory.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) throw new Error('Category not found')
    await this.prisma.menuCategory.delete({ where: { id } })
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

  async createItem(
    tenantId: string,
    body: { category_id: string; name: string; description?: string; price_kobo: number; available?: boolean },
  ): Promise<MenuItem> {
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: body.category_id, tenant_id: tenantId },
    })
    if (!category) throw new Error('Category not found')
    return this.prisma.menuItem.create({
      data: {
        tenant_id: tenantId,
        category_id: body.category_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        price_kobo: body.price_kobo,
        available: body.available ?? true,
      },
    })
  }

  async updateItem(
    tenantId: string,
    id: string,
    body: { name?: string; description?: string; price_kobo?: number; available?: boolean; category_id?: string },
  ): Promise<MenuItem> {
    const existing = await this.prisma.menuItem.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) throw new Error('Item not found')
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() || null } : {}),
        ...(body.price_kobo !== undefined ? { price_kobo: body.price_kobo } : {}),
        ...(body.available !== undefined ? { available: body.available } : {}),
        ...(body.category_id !== undefined ? { category_id: body.category_id } : {}),
      },
    })
  }

  async deleteItem(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.menuItem.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) throw new Error('Item not found')
    await this.prisma.menuItem.delete({ where: { id } })
  }
}
