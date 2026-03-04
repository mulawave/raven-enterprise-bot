export type DeadLetterMessage = {
  id: string
  tenantId: string
  channel: string
  to: string
  text: string
  attempt: number
  failedAt: number
  reason: string
}

export type DeadLetterStore = {
  list: (limit: number) => Promise<DeadLetterMessage[]>
  archive: (id: string) => Promise<void>
}

export type DeadLetterSink = {
  handle: (message: DeadLetterMessage) => Promise<void>
}

export type DistributedLock = {
  acquire: (key: string, ttlMs: number) => Promise<boolean>
  release: (key: string) => Promise<void>
}

class NoopLock implements DistributedLock {
  async acquire() { return true }
  async release() {}
}

export class DeadLetterHandler {
  private readonly lock: DistributedLock
  private readonly lockTtlMs: number
  private readonly maxConcurrency: number

  constructor(
    private readonly store: DeadLetterStore,
    private readonly sink: DeadLetterSink,
    options?: {
      lock?: DistributedLock
      lockTtlMs?: number
      maxConcurrency?: number
    }
  ) {
    this.lock = options?.lock ?? new NoopLock()
    this.lockTtlMs = options?.lockTtlMs ?? 30000
    this.maxConcurrency = options?.maxConcurrency ?? 5
  }

  async runBatch(limit = 50): Promise<void> {
    const items = await this.store.list(limit)
    await this.runWithConcurrency(items, this.maxConcurrency, (item) => this.processItem(item))
  }

  private async processItem(item: DeadLetterMessage): Promise<void> {
    const lockKey = this.lockKey(item)
    const acquired = await this.lock.acquire(lockKey, this.lockTtlMs)
    if (!acquired) return
    try {
      await this.sink.handle(item)
      await this.store.archive(item.id)
    } finally {
      await this.lock.release(lockKey)
    }
  }

  private lockKey(item: DeadLetterMessage): string {
    return `worker:deadletter:lock:${item.id}`
  }

  private async runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
    const limit = Math.max(1, concurrency)
    const queue = items.slice()
    const workers: Promise<void>[] = []
    for (let i = 0; i < limit; i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (!item) return
          await fn(item)
        }
      })())
    }
    await Promise.all(workers)
  }
}
