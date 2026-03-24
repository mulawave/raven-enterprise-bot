import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

export class MessageSender {
  constructor(private readonly accessToken: string, private readonly phoneNumberId: string) {}

  async sendMessage(to: string, text: string) {
    await axios.post(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
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

  /**
   * Uploads a local file to the WhatsApp Media API and returns the media_id.
   * Uses Node 18+ native FormData + fetch.
   */
  async uploadMedia(filePath: string, mimeType: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath)
    const blob = new Blob([fileBuffer], { type: mimeType })
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('type', mimeType)
    formData.append('file', blob, path.basename(filePath))

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData,
      },
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`WhatsApp media upload failed: ${response.status} ${err}`)
    }
    const data = await response.json() as { id: string }
    return data.id
  }

  /**
   * Sends a media message (image/audio/video/document) to a WhatsApp number
   * using a previously uploaded media_id.
   */
  async sendMediaMessage(
    to: string,
    mediaId: string,
    mediaType: 'image' | 'audio' | 'video' | 'document',
    caption?: string,
  ): Promise<void> {
    const mediaPayload: Record<string, unknown> = { id: mediaId }
    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      mediaPayload['caption'] = caption
    }

    await axios.post(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: mediaType,
        [mediaType]: mediaPayload,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  async sendImageByLink(to: string, imageUrl: string, caption?: string): Promise<void> {
    const imagePayload: Record<string, unknown> = { link: imageUrl }
    if (caption) imagePayload['caption'] = caption

    await axios.post(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: imagePayload,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  /**
   * Uploads a Buffer to the WhatsApp Media API and returns the media_id.
   * Useful for server-generated files (e.g. PDF receipts) without writing to disk.
   */
  async uploadMediaBuffer(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('type', mimeType)
    formData.append('file', blob, filename)

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData,
      },
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`WhatsApp media upload failed: ${response.status} ${err}`)
    }
    const data = await response.json() as { id: string }
    return data.id
  }

  /**
   * Sends a document (e.g. PDF) to a WhatsApp number using a previously uploaded media_id.
   */
  async sendDocument(to: string, mediaId: string, filename: string): Promise<void> {
    await axios.post(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: { id: mediaId, filename },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  /**
   * Sends a WhatsApp interactive list message.
   * Constraints: section title ≤ 24 chars, row title ≤ 24 chars, row description ≤ 72 chars.
   */
  async sendInteractiveList(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    buttonText: string,
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  ): Promise<void> {
    await axios.post(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          footer: { text: footerText },
          action: { button: buttonText, sections },
        },
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
