import { spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const TENANT_TABLES = [
  'Tenant',
  'User',
  'Customer',
  'Conversation',
  'Message',
  'MenuCategory',
  'MenuItem',
  'Order',
  'OrderItem',
  'RoomType',
  'Booking',
  'Payment',
  'StaffNotification'
]

const QUOTED = (name: string) => `\"${name}\"`

export type DistributedLock = {
  acquire: (key: string, ttlMs: number) => Promise<boolean>
  release: (key: string) => Promise<void>
}

class NoopLock implements DistributedLock {
  async acquire() { return true }
  async release() {}
}

export async function runTenantBackup(tenantId: string, outputDir: string, lock?: DistributedLock) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED')
  if (!tenantId) throw new Error('TENANT_ID_REQUIRED')

  const guard = lock ?? new NoopLock()
  const lockKey = `worker:backup:lock:${tenantId}`
  const acquired = await guard.acquire(lockKey, 900000)
  if (!acquired) return { skipped: true }

  try {
    await mkdir(outputDir, { recursive: true })
    const filePath = join(outputDir, `tenant-${tenantId}.sql`)

    const args = [
      '--dbname', databaseUrl,
      '--data-only',
      '--column-inserts',
      '--no-owner',
      '--no-privileges',
      '--file', filePath,
    ]

    for (const table of TENANT_TABLES) {
      args.push('--table', table)
      args.push('--where', `${QUOTED('tenant_id')}='${tenantId}'`)
    }

    await exec('pg_dump', args)
    return { filePath }
  } finally {
    await guard.release(lockKey)
  }
}

function exec(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error('BACKUP_FAILED'))
    })
  })
}
