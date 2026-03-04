import { spawn } from 'child_process'

export type DistributedLock = {
  acquire: (key: string, ttlMs: number) => Promise<boolean>
  release: (key: string) => Promise<void>
}

class NoopLock implements DistributedLock {
  async acquire() { return true }
  async release() {}
}

export async function runTenantRestore(tenantId: string, inputFile: string, lock?: DistributedLock) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED')
  if (!tenantId) throw new Error('TENANT_ID_REQUIRED')
  if (!inputFile) throw new Error('INPUT_FILE_REQUIRED')

  const guard = lock ?? new NoopLock()
  const lockKey = `worker:restore:lock:${tenantId}`
  const acquired = await guard.acquire(lockKey, 900000)
  if (!acquired) return { skipped: true }

  try {
    await exec('psql', ['--dbname', databaseUrl, '--file', inputFile])
    return { restored: true, tenantId }
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
      else reject(new Error('RESTORE_FAILED'))
    })
  })
}
