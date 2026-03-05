import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigLoaderService } from '../config/config-loader.service'

interface SendMailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly configLoader: ConfigLoaderService) {}

  /**
   * Build a nodemailer transporter from DB/env config
   */
  private async buildTransporter(): Promise<nodemailer.Transporter> {
    const provider = (await this.configLoader.get('SMTP_PROVIDER')) ?? 'smtp'
    const host = (await this.configLoader.get('SMTP_HOST')) ?? process.env.SMTP_HOST
    const port = parseInt((await this.configLoader.get('SMTP_PORT')) ?? process.env.SMTP_PORT ?? '587', 10)
    const user = (await this.configLoader.get('SMTP_USER')) ?? process.env.SMTP_USER
    const pass = (await this.configLoader.get('SMTP_PASS')) ?? process.env.SMTP_PASS
    const secure = ((await this.configLoader.get('SMTP_SECURE')) ?? process.env.SMTP_SECURE ?? 'false') === 'true'

    if (provider === 'internal') {
      // Ethereal / internal test SMTP
      const testAccount = await nodemailer.createTestAccount()
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
    }

    if (!host || !user || !pass) {
      throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in API Keys.')
    }

    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
  }

  /**
   * Send an email
   */
  async send(opts: SendMailOptions): Promise<void> {
    const from = opts.from ?? ((await this.configLoader.get('SMTP_FROM')) ?? process.env.SMTP_FROM ?? 'no-reply@raven-ai.online')
    const transporter = await this.buildTransporter()
    const info = await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html })
    this.logger.log(`Email sent to ${opts.to}: ${info.messageId}`)
  }

  /**
   * Send a test email
   */
  async sendTest(to: string): Promise<{ success: boolean; messageId?: string; preview?: string; error?: string }> {
    try {
      const provider = (await this.configLoader.get('SMTP_PROVIDER')) ?? 'smtp'
      const from = (await this.configLoader.get('SMTP_FROM')) ?? process.env.SMTP_FROM ?? 'test@raven-ai.online'

      let transporter: nodemailer.Transporter
      let previewUrl: string | false = false

      if (provider === 'internal' || !(await this.configLoader.get('SMTP_HOST'))) {
        const testAccount = await nodemailer.createTestAccount()
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        })
      } else {
        transporter = await this.buildTransporter()
      }

      const info = await transporter.sendMail({
        from,
        to,
        subject: '✅ Raven Email Test — Configuration Verified',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;background:#fff;border-radius:8px;border:1px solid #E5E7EB;overflow:hidden">
            <div style="background:#4F46E5;padding:24px 32px">
              <h2 style="color:#fff;margin:0;font-size:20px">Email Configuration Test</h2>
            </div>
            <div style="padding:32px;color:#374151">
              <p>This is a test email from <strong>Raven Enterprise</strong>.</p>
              <p>If you're seeing this, your email configuration is <strong style="color:#059669">working correctly</strong>.</p>
              <p style="color:#9CA3AF;font-size:13px;margin-top:32px">Sent at ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      })

      previewUrl = nodemailer.getTestMessageUrl(info)

      return {
        success: true,
        messageId: info.messageId,
        preview: previewUrl !== false ? previewUrl : undefined,
      }
    } catch (err: any) {
      this.logger.error('Test email failed', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Render a template by substituting {{VARIABLE}} placeholders
   */
  renderTemplate(html: string, vars: Record<string, string>): string {
    return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
  }
}
