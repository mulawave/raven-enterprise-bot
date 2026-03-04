export interface ParsedMessage {
  conversationId: string
  from: string
  text: string
  timestamp: string
}

export class MessageParser {
  parse(payload: any): ParsedMessage[] {
    if (!payload?.entry) return []
    
    const messages: ParsedMessage[] = []
    
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (value?.messages && value?.contacts) {
          for (const msg of value.messages) {
            if (msg.type === 'text' && msg.text?.body) {
              messages.push({
                conversationId: value.metadata?.phone_number_id || '',
                from: msg.from || '',
                text: msg.text.body,
                timestamp: msg.timestamp || String(Date.now()),
              })
            }
          }
        }
      }
    }
    
    return messages
  }
}
