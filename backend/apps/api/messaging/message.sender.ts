import axios from 'axios'

export class MessageSender {
  constructor(private readonly accessToken: string, private readonly phoneNumberId: string) {}

  async sendMessage(to: string, text: string) {
    await axios.post(
      `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
