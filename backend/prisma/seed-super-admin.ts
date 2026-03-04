import { PrismaClient, UserRole, UserScope } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@raven.ai'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'

  console.log('🔐 Seeding SUPER_ADMIN...')

  // Check if SUPER_ADMIN already exists
  const existing = await prisma.user.findFirst({
    where: {
      role: UserRole.SUPER_ADMIN,
      scope: UserScope.SYSTEM,
    },
  })

  if (existing) {
    console.log('✅ SUPER_ADMIN already exists:', existing.email)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create SUPER_ADMIN
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      scope: UserScope.SYSTEM,
      tenant_id: null,
    },
  })

  console.log('✅ SUPER_ADMIN created successfully')
  console.log('   Email:', admin.email)
  console.log('   Role:', admin.role)
  console.log('   Scope:', admin.scope)
  console.log('   ID:', admin.id)
  console.log('')
  console.log('⚠️  IMPORTANT: Change the default password immediately in production!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding SUPER_ADMIN:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
