import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up useless food-related data...')

  const tenantId = 'c4b264bf-783e-40f0-87a2-cd6340dc5bc4'

  // Delete FAQs
  const faqDelete = await prisma.tenantFaq.deleteMany({
    where: { tenant_id: tenantId },
  })
  console.log(`✅ Deleted ${faqDelete.count} FAQs`)

  // Delete menu items
  const menuItemDelete = await prisma.menuItem.deleteMany({
    where: { tenant_id: tenantId },
  })
  console.log(`✅ Deleted ${menuItemDelete.count} menu items`)

  // Delete menu categories
  const categoryDelete = await prisma.menuCategory.deleteMany({
    where: { tenant_id: tenantId },
  })
  console.log(`✅ Deleted ${categoryDelete.count} menu categories`)

  // Delete room types
  const roomTypeDelete = await prisma.roomType.deleteMany({
    where: { tenant_id: tenantId },
  })
  console.log(`✅ Deleted ${roomTypeDelete.count} room types`)

  console.log('🎉 Cleanup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
