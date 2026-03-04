import { PrismaClient, MenuCategory, MenuItem } from '@prisma/client';
export declare class MenuCategoryService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getCategories(tenantId: string): Promise<MenuCategory[]>;
}
export declare class MenuItemService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getItems(tenantId: string, categoryId?: string): Promise<MenuItem[]>;
    getItemById(tenantId: string, itemId: string): Promise<MenuItem | null>;
}
