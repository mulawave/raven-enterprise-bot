export class ConversationViewer {
  async view(prisma: any, tenantId: string, userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { tenant_id: tenantId, customer_id: userId },
      orderBy: { updated_at: 'desc' },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          select: { id: true, sender_type: true, sender_id: true, content: true, created_at: true },
        },
      },
    })
    return { tenantId, userId, conversations }
  }
}
