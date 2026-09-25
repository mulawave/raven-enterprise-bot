/**
 * Bot Config Backfill Migration
 *
 * For every tenant that has BOT_ENABLED or BOT_SYSTEM_PROMPT in Tenant.theme
 * but has no TenantBotConfig row, this script creates the canonical row by
 * migrating those legacy values.
 *
 * Run once after deploying the schema migration that adds TenantBotConfig.enabled:
 *   npx ts-node -r tsconfig-paths/register prisma/migrate-bot-config.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseLegacyTheme(themeStr: string | null | undefined): Record<string, unknown> {
  if (!themeStr) return {}
  try { return JSON.parse(themeStr) as Record<string, unknown> } catch { return {} }
}

async function main() {
  console.log('🔄 Bot config backfill — starting…')

  // Find tenants that have no TenantBotConfig row yet
  const tenantsWithoutConfig = await prisma.tenant.findMany({
    where: { botConfig: null },
    select: { id: true, name: true, theme: true },
  })

  console.log(`   Found ${tenantsWithoutConfig.length} tenant(s) without a TenantBotConfig row`)

  let created = 0
  let skipped = 0

  for (const tenant of tenantsWithoutConfig) {
    const theme = parseLegacyTheme(tenant.theme)
    const hasLegacyBot = theme['BOT_ENABLED'] !== undefined || theme['BOT_SYSTEM_PROMPT'] !== undefined

    // Only backfill tenants that actually had legacy bot config
    if (!hasLegacyBot) {
      skipped++
      continue
    }

    await prisma.tenantBotConfig.create({
      data: {
        tenant_id: tenant.id,
        enabled: theme['BOT_ENABLED'] === 'true',
        system_prompt: (theme['BOT_SYSTEM_PROMPT'] as string) ?? null,
        personality_tone: 'professional',
        fallback_reply: null,
        about_reply_text: null,
        about_image_url: null,
        about_cta_url: null,
        about_cta_label: 'Start for free',
        escalation_message: "I'll have a team member reach you shortly.",
      },
    })

    console.log(`   ✅ Backfilled: ${tenant.name} (${tenant.id}) — enabled=${theme['BOT_ENABLED'] === 'true'}`)
    created++
  }

  console.log(`\n✅ Done — created ${created} row(s), skipped ${skipped} tenant(s) with no legacy bot config`)
}

main()
  .catch((e) => { console.error('❌ Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
