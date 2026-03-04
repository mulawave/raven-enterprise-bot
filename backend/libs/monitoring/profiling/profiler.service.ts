export class ProfilerService {
  private apiResponseTimes: Record<string, number[]> = {}
  private dbQueryDurations: number[] = []
  private redisLatencies: number[] = []
  private messagingLatencies: number[] = []

  recordApiResponse(path: string, durationMs: number) {
    if (!this.apiResponseTimes[path]) this.apiResponseTimes[path] = []
    this.apiResponseTimes[path].push(durationMs)
  }

  recordDbQuery(durationMs: number) {
    this.dbQueryDurations.push(durationMs)
  }

  recordRedisAccess(durationMs: number) {
    this.redisLatencies.push(durationMs)
  }

  recordMessagingAdapter(durationMs: number) {
    this.messagingLatencies.push(durationMs)
  }

  getApiResponseStats() {
    return this.apiResponseTimes
  }

  getDbQueryStats() {
    return this.dbQueryDurations
  }

  getRedisStats() {
    return this.redisLatencies
  }

  getMessagingStats() {
    return this.messagingLatencies
  }
}
