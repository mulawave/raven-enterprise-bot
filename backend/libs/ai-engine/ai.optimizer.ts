import { IntentRouter, Intent } from './intent.router'

export class AiOptimizer {
  private responseCache: Map<string, string> = new Map()
  private conversationCaps: Map<string, number> = new Map()
  private readonly maxCallsPerConversation = 20

  shouldCallAI(conversationId: string, prompt: string, router: IntentRouter): boolean {
    const intent = router.route(prompt).intent
    if (intent === 'GeneralInfo' || intent === 'Greeting') return false
    const cap = this.conversationCaps.get(conversationId) || 0
    if (cap >= this.maxCallsPerConversation) return false
    return true
  }

  getCachedResponse(prompt: string): string | undefined {
    return this.responseCache.get(prompt)
  }

  cacheResponse(prompt: string, response: string): void {
    this.responseCache.set(prompt, response)
  }

  incrementConversation(conversationId: string): void {
    const cap = this.conversationCaps.get(conversationId) || 0
    this.conversationCaps.set(conversationId, cap + 1)
  }
}
