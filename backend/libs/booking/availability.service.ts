import { PrismaClient } from '@prisma/client'

export class AvailabilityService {
  constructor(private readonly prisma: PrismaClient) {}

  async isRoomTypeAvailable(tenantId: string, roomTypeId: string, start: Date, end: Date): Promise<boolean> {
    const overlaps = await this.prisma.booking.findFirst({
      where: {
        tenant_id: tenantId,
        room_type_id: roomTypeId,
        status: { in: ['pending', 'confirmed'] },
        OR: [
          { start_date: { lte: end }, end_date: { gte: start } },
        ],
      },
    })
    return !overlaps
  }

  async getRoomTypes(tenantId: string): Promise<any[]> {
    return this.prisma.roomType.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    })
  }
}
