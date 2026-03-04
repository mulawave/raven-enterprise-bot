"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemService = exports.MenuCategoryService = void 0;
class MenuCategoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategories(tenantId) {
        return this.prisma.menuCategory.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
    }
}
exports.MenuCategoryService = MenuCategoryService;
class MenuItemService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getItems(tenantId, categoryId) {
        return this.prisma.menuItem.findMany({
            where: {
                tenant_id: tenantId,
                ...(categoryId && { category_id: categoryId }),
            },
            orderBy: { created_at: 'asc' },
        });
    }
    async getItemById(tenantId, itemId) {
        return this.prisma.menuItem.findFirst({
            where: { tenant_id: tenantId, id: itemId },
        });
    }
}
exports.MenuItemService = MenuItemService;
