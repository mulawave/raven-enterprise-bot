import { PrismaClient } from '@prisma/client'

export class RoomTypeService {
  constructor(private readonly prisma: PrismaClient) {}

  async getRoomTypes(tenantId: string) {
    return this.prisma.roomType.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async getRoomTypeById(tenantId: string, roomTypeId: string) {
    return this.prisma.roomType.findFirst({
      where: { tenant_id: tenantId, id: roomTypeId },
    })
  }
}
