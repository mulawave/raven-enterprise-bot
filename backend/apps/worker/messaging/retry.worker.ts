export type OutboundMessage = {
  id: string
  tenantId: string
  channel: string
  to: string
  text: string
  attempt: number
  nextAttemptAt: number
}

export type MessageQueue = {
  enqueue: (message: OutboundMessage) => Promise<void>
  dequeueDue: (now: number, limit: number) => Promise<OutboundMessage[]>
  markFailed: (messageId: string, reason: string) => Promise<void>
}

export type Sender = {
  send: (message: OutboundMessage) => Promise<void>
}

export type RetryPolicy = {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

export type DistributedLock = {
  acquire: (key: string, ttlMs: number) => Promise<boolean>
  release: (key: string) => Promise<void>
}

export type DedupStore = {
  exists: (key: string) => Promise<boolean>
  mark: (key: string, ttlMs: number) => Promise<void>
}

class NoopLock implements DistributedLock {
  async acquire() { return true }
  async release() {}
}

class NoopDedup implements DedupStore {
  async exists() { return false }
  async mark() {}
}

export class MessageRetryWorker {
  private readonly lock: DistributedLock
  private readonly dedup: DedupStore
  private readonly lockTtlMs: number
  private readonly dedupTtlMs: number
  private readonly maxConcurrency: number

  constructor(
    private readonly queue: MessageQueue,
    private readonly sender: Sender,
    private readonly policy: RetryPolicy,
    options?: {
      lock?: DistributedLock
      dedup?: DedupStore
      lockTtlMs?: number
      dedupTtlMs?: number
      maxConcurrency?: number
    }
  ) {
    this.lock = options?.lock ?? new NoopLock()
    this.dedup = options?.dedup ?? new NoopDedup()
    this.lockTtlMs = options?.lockTtlMs ?? 30000
    this.dedupTtlMs = options?.dedupTtlMs ?? 600000
    this.maxConcurrency = options?.maxConcurrency ?? 10
  }

  async runBatch(now = Date.now(), limit = 50): Promise<void> {
    const due = await this.queue.dequeueDue(now, limit)
    await this.runWithConcurrency(due, this.maxConcurrency, (msg) => this.processMessage(msg, now))
  }

  private async processMessage(msg: OutboundMessage, now: number): Promise<void> {
    const lockKey = this.lockKey(msg)
    const acquired = await this.lock.acquire(lockKey, this.lockTtlMs)
    if (!acquired) return
    try {
      await this.sender.send(msg)
    } catch (e: any) {
      const attempt = msg.attempt + 1
      if (attempt >= this.policy.maxAttempts) {
        await this.queue.markFailed(msg.id, e?.code || 'DELIVERY_FAILED')
        return
      }
      const delay = this.backoff(attempt)
      const retry: OutboundMessage = {
        ...msg,
        attempt,
        nextAttemptAt: now + delay,
      }
      const dedupKey = this.dedupKey(retry)
      const exists = await this.dedup.exists(dedupKey)
      if (!exists) {
        await this.dedup.mark(dedupKey, this.dedupTtlMs)
        await this.queue.enqueue(retry)
      }
    } finally {
      await this.lock.release(lockKey)
    }
  }

  private backoff(attempt: number): number {
    const delay = this.policy.baseDelayMs * Math.pow(2, attempt - 1)
    return Math.min(delay, this.policy.maxDelayMs)
  }

  private lockKey(msg: OutboundMessage): string {
    return `worker:retry:lock:${msg.id}`
  }

  private dedupKey(msg: OutboundMessage): string {
    return `worker:retry:dedup:${msg.id}:${msg.attempt}:${msg.nextAttemptAt}`
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
