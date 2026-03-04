import { MessageParser, ParsedMessage } from './message.parser'

export class FacebookAdapter {
  constructor(private readonly parser: MessageParser) {}

  parse(payload: any): ParsedMessage[] {
    const normalized = this.normalize(payload)
    return this.parser.parse(normalized)
  }

  private normalize(payload: any): any {
    const entry = Array.isArray(payload?.entry) ? payload.entry : []
    return {
      entry: entry.map((e: any) => {
        const messaging = Array.isArray(e?.messaging) ? e.messaging : []
        const messages = messaging
          .map((m: any) => ({
            from: m?.sender?.id || '',
            text: { body: m?.message?.text || '' },
            timestamp: m?.timestamp ? String(m.timestamp) : '',
          }))
          .filter((m: any) => m.from || m.text?.body)
        return {
          changes: [
            {
              value: {
                metadata: { phone_number_id: e?.id || '' },
                messages,
                contacts: messages.map((m: any) => ({ wa_id: m.from })),
              },
            },
          ],
        }
      }),
    }
  }
}
