import { PrismaClient } from '@prisma/client'

export class RightToEraseHandler {
	constructor(private readonly prisma: PrismaClient) {}

	async eraseUserData(userId: string): Promise<void> {
		await this.prisma.message.deleteMany({ where: { sender_id: userId } })
		await this.prisma.conversation.deleteMany({ where: { customer_id: userId } })
		await this.prisma.order.deleteMany({ where: { customer_id: userId } })
		await this.prisma.booking.deleteMany({ where: { customer_id: userId } })
		await this.prisma.customer.deleteMany({ where: { id: userId } })
		await this.prisma.user.deleteMany({ where: { id: userId } })
	}
}
