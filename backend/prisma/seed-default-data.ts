import { PrismaClient, UserRole, UserScope } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding default FAQs and catalog data...')

  // Find or create richardobroh@gmail.com user
  let user = await prisma.user.findUnique({
    where: { email: 'richardobroh@gmail.com' },
  })

  let tenantId: string

  if (!user) {
    console.log('Creating user: richardobroh@gmail.com')
    const hashedPassword = await bcrypt.hash('DefaultPassword123!', 10)
    
    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Richard\'s Business',
        logo_url: null,
        theme: null,
      },
    })
    tenantId = tenant.id

    // Create user
    user = await prisma.user.create({
      data: {
        email: 'richardobroh@gmail.com',
        password: hashedPassword,
        role: UserRole.admin,
        scope: UserScope.TENANT,
        tenant_id: tenantId,
        name: 'Richard Obroh',
      },
    })
    console.log('✅ User created:', user.email)
  } else {
    tenantId = user.tenant_id!
    console.log('✅ User found:', user.email, 'Tenant ID:', tenantId)
  }

  // Create default catalog categories and items
  console.log('Creating default catalog data...')
  
  // Check if categories already exist
  const existingCategories = await prisma.menuCategory.count({
    where: { tenant_id: tenantId },
  })

  if (existingCategories === 0) {
    const mainCourseCategory = await prisma.menuCategory.create({
      data: {
        tenant_id: tenantId,
        name: 'Main Courses',
      },
    })

    const drinksCategory = await prisma.menuCategory.create({
      data: {
        tenant_id: tenantId,
        name: 'Drinks',
      },
    })

    // Create menu items
    await prisma.menuItem.createMany({
      data: [
        {
          tenant_id: tenantId,
          category_id: mainCourseCategory.id,
          name: 'Jollof Rice',
          description: 'Classic Nigerian jollof rice with your choice of protein',
          price_kobo: 250000, // ₦2,500
          available: true,
        },
        {
          tenant_id: tenantId,
          category_id: mainCourseCategory.id,
          name: 'Fried Rice',
          description: 'Flavorful fried rice with mixed vegetables',
          price_kobo: 200000, // ₦2,000
          available: true,
        },
        {
          tenant_id: tenantId,
          category_id: mainCourseCategory.id,
          name: 'Fried Plantain',
          description: 'Sweet and crispy fried plantain',
          price_kobo: 150000, // ₦1,500
          available: true,
        },
        {
          tenant_id: tenantId,
          category_id: mainCourseCategory.id,
          name: 'Grilled Chicken',
          description: 'Perfectly grilled chicken with spices',
          price_kobo: 300000, // ₦3,000
          available: true,
        },
        {
          tenant_id: tenantId,
          category_id: drinksCategory.id,
          name: 'Chapman',
          description: 'Classic Nigerian cocktail',
          price_kobo: 150000, // ₦1,500
          available: true,
        },
        {
          tenant_id: tenantId,
          category_id: drinksCategory.id,
          name: 'Zobo',
          description: 'Traditional Nigerian zobo drink',
          price_kobo: 50000, // ₦500
          available: true,
        },
      ],
    })

    console.log('✅ Default catalog data created')
  } else {
    console.log('✅ Catalog data already exists, skipping')
  }

  // Create default FAQs
  console.log('Creating default FAQs...')
  
  const existingFaqs = await prisma.tenantFaq.count({
    where: { tenant_id: tenantId },
  })

  if (existingFaqs === 0) {
    await prisma.tenantFaq.createMany({
      data: [
        {
          tenant_id: tenantId,
          question: 'What are your opening hours?',
          answer: 'We are open Monday to Saturday from 10:00 AM to 10:00 PM. Sundays we open from 12:00 PM to 9:00 PM.',
          sort_order: 1,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'Do you offer delivery?',
          answer: 'Yes, we offer delivery within a 5km radius. Delivery fee is ₦500 for orders below ₦5,000, and free for orders above ₦5,000.',
          sort_order: 2,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'What payment methods do you accept?',
          answer: 'We accept cash, bank transfer, and Paystack payments. You can pay securely through our payment link when you order.',
          sort_order: 3,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'How long does delivery take?',
          answer: 'Delivery typically takes 30-45 minutes depending on your location and order size.',
          sort_order: 4,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'Can I customize my order?',
          answer: 'Yes, you can request modifications like extra sauce, less salt, or no onions. Please mention your preferences when placing your order.',
          sort_order: 5,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'Do you have vegetarian options?',
          answer: 'Yes, we offer vegetarian dishes including vegetable fried rice, moi moi, and salads. Please ask our team for recommendations.',
          sort_order: 6,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'How do I place an order?',
          answer: 'You can place an order directly through WhatsApp! Just send us a message with what you\'d like to order, and we\'ll guide you through the process.',
          sort_order: 7,
          hidden: false,
          source: 'manual',
        },
        {
          tenant_id: tenantId,
          question: 'What is your most popular dish?',
          answer: 'Our Jollof Rice with Grilled Chicken is our most popular dish. Customers love the perfect balance of spices and the tender, juicy chicken.',
          sort_order: 8,
          hidden: false,
          source: 'manual',
        },
      ],
    })

    console.log('✅ Default FAQs created')
  } else {
    console.log('✅ FAQs already exist, skipping')
  }

  // Create default room types (for hotel functionality)
  console.log('Creating default room types...')
  
  const existingRooms = await prisma.roomType.count({
    where: { tenant_id: tenantId },
  })

  if (existingRooms === 0) {
    await prisma.roomType.createMany({
      data: [
        {
          tenant_id: tenantId,
          name: 'Standard Room',
          price_kobo: 15000000, // ₦15,000/night
        },
        {
          tenant_id: tenantId,
          name: 'Deluxe Suite',
          price_kobo: 30000000, // ₦30,000/night
        },
        {
          tenant_id: tenantId,
          name: 'Executive Suite',
          price_kobo: 50000000, // ₦50,000/night
        },
      ],
    })

    console.log('✅ Default room types created')
  } else {
    console.log('✅ Room types already exist, skipping')
  }

  console.log('')
  console.log('🎉 Default data seeding complete!')
  console.log('   User: richardobroh@gmail.com')
  console.log('   Tenant ID:', tenantId)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding default data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
