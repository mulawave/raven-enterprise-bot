import PDFDocument from 'pdfkit'
import https from 'https'
import http from 'http'

const API_BASE = process.env.API_BASE_URL ?? 'https://api.raven-ai.online'

export interface OrderReceiptData {
  orderId: string
  tenantName: string
  tenantLogoUrl?: string
  tenantAddress?: string
  customerName: string
  customerEmail: string
  items: Array<{ name: string; quantity: number; priceKobo: number }>
  totalKobo: number
  paymentRef: string
  paidAt: Date
}

function resolveUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${API_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`
}

function fetchImageBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000)
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        clearTimeout(timer)
        res.resume()
        resolve(null)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)) })
      res.on('error', () => { clearTimeout(timer); resolve(null) })
    })
    req.on('error', () => { clearTimeout(timer); resolve(null) })
  })
}

/**
 * Generates a professional A4 PDF invoice/receipt.
 *
 * Layout sections (all absolute coordinates, no moveDown):
 *   1. 5px indigo top accent bar
 *   2. Header: logo (left) + business name/address + "RECEIPT" label (right)
 *   3. Horizontal rule
 *   4. Two-column meta: BILLED TO (left) | ORDER DETAILS (right)
 *   5. Horizontal rule
 *   6. Items table — DESCRIPTION / QTY / UNIT PRICE / LINE TOTAL
 *   7. Total strip (indigo top border, large bold amount)
 *   8. PAID status strip (green)
 *   9. Footer text
 *   10. 12px indigo bottom accent bar
 *
 * Note: PDFKit standard fonts (Helvetica) do not support ₦ — amounts use "NGN X,XX0.00"
 */
export async function generateReceiptPdf(data: OrderReceiptData): Promise<Buffer> {
  let logoBuffer: Buffer | null = null
  if (data.tenantLogoUrl) {
    try { logoBuffer = await fetchImageBuffer(resolveUrl(data.tenantLogoUrl)) } catch { /* non-fatal */ }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const fmt = (kobo: number) =>
      `NGN ${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const L = 55   // left margin
    const R = 540  // right edge
    const W = R - L  // 485pt usable width

    // ── 1. TOP ACCENT BAR ────────────────────────────────────────
    doc.rect(0, 0, 595, 5).fill('#4F46E5')

    // ── 2. HEADER ────────────────────────────────────────────────
    const hY = 22
    let logoRendered = false
    if (logoBuffer) {
      try { doc.image(logoBuffer, L, hY, { fit: [64, 64] }); logoRendered = true } catch { /* unsupported format */ }
    }

    const nameX = logoRendered ? L + 74 : L
    const nameW = logoRendered ? 215 : 275

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(17)
      .text(data.tenantName, nameX, hY + (logoRendered ? 8 : 18), { width: nameW, lineBreak: false, ellipsis: true })
    if (data.tenantAddress) {
      doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
        .text(data.tenantAddress.slice(0, 75), nameX, hY + (logoRendered ? 32 : 38), { width: nameW })
    }

    doc.fillColor('#4F46E5').font('Helvetica-Bold').fontSize(26)
      .text('RECEIPT', R - 168, hY + 8, { width: 168, align: 'right' })
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
      .text(`#${data.orderId.slice(0, 8).toUpperCase()}`, R - 168, hY + 43, { width: 168, align: 'right' })
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8.5)
      .text(
        data.paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }),
        R - 168, hY + 58, { width: 168, align: 'right' },
      )

    // Divider
    const d1Y = hY + 84
    doc.moveTo(L, d1Y).lineTo(R, d1Y).lineWidth(1).stroke('#e2e8f0')

    // ── 3. BILL TO + ORDER DETAILS ───────────────────────────────
    const metaY = d1Y + 18

    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7.5)
      .text('BILLED TO', L, metaY, { characterSpacing: 0.6 })
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12)
      .text(data.customerName, L, metaY + 13)
    doc.fillColor('#64748b').font('Helvetica').fontSize(9)
      .text(data.customerEmail, L, metaY + 30)

    const detX = 322
    const detW = R - detX
    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7.5)
      .text('ORDER DETAILS', detX, metaY, { width: detW, align: 'right', characterSpacing: 0.6 })

    const detailRows: Array<[string, string, boolean]> = [
      ['Order ID', `#${data.orderId.slice(0, 8).toUpperCase()}`, true],
      ['Date', data.paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }), false],
      ['Payment Ref', data.paymentRef.length > 22 ? `${data.paymentRef.slice(0, 21)}...` : data.paymentRef, false],
    ]
    let drY = metaY + 13
    for (const [label, value, bold] of detailRows) {
      doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text(label, detX, drY, { width: 75 })
      doc.fillColor(bold ? '#0f172a' : '#1e293b').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .text(value, detX + 77, drY, { width: detW - 77, align: 'right' })
      drY += 15
    }

    // Divider
    const d2Y = metaY + 70
    doc.moveTo(L, d2Y).lineTo(R, d2Y).lineWidth(0.5).stroke('#e2e8f0')

    // ── 4. ITEMS TABLE ───────────────────────────────────────────
    // Columns: Description(8-237) | QTY(245-290) | Unit Price(295-382) | Line Total(389-end)
    const drawTableHeader = (y: number) => {
      doc.rect(L, y, W, 23).fill('#f1f5f9')
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
      doc.text('DESCRIPTION', L + 8, y + 8, { width: 230 })
      doc.text('QTY', L + 245, y + 8, { width: 46, align: 'center' })
      doc.text('UNIT PRICE', L + 295, y + 8, { width: 88, align: 'right' })
      doc.text('LINE TOTAL', L + 389, y + 8, { width: 93, align: 'right' })
    }

    const tblY = d2Y + 16
    drawTableHeader(tblY)

    let rowY = tblY + 23
    let even = false
    for (const item of data.items) {
      const rowH = 27
      if (rowY + rowH > 758) {
        doc.addPage()
        doc.rect(0, 0, 595, 5).fill('#4F46E5')
        rowY = 30
        drawTableHeader(rowY)
        rowY += 23
        even = false
      }
      if (even) doc.rect(L, rowY, W, rowH).fill('#fafbfc')
      even = !even

      const lineAmt = item.priceKobo * item.quantity
      const name = item.name.length > 52 ? item.name.slice(0, 51) + '...' : item.name

      doc.fillColor('#334155').font('Helvetica').fontSize(9)
      doc.text(name, L + 8, rowY + 9, { width: 230 })
      doc.text(String(item.quantity), L + 245, rowY + 9, { width: 46, align: 'center' })
      doc.text(fmt(item.priceKobo), L + 295, rowY + 9, { width: 88, align: 'right' })
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
        .text(fmt(lineAmt), L + 389, rowY + 9, { width: 93, align: 'right' })

      rowY += rowH
      doc.moveTo(L, rowY).lineTo(R, rowY).lineWidth(0.3).stroke('#f1f5f9')
    }

    // ── 5. TOTAL STRIP ───────────────────────────────────────────
    const totY = rowY + 10
    doc.rect(L, totY, W, 38).fill('#f8fafc')
    doc.moveTo(L, totY).lineTo(R, totY).lineWidth(2).stroke('#4F46E5')
    doc.fillColor('#475569').font('Helvetica').fontSize(10)
      .text('TOTAL AMOUNT PAID', L + 8, totY + 12)
    doc.fillColor('#4F46E5').font('Helvetica-Bold').fontSize(17)
      .text(fmt(data.totalKobo), L, totY + 10, { width: W - 8, align: 'right' })

    // ── 6. PAID STATUS STRIP ─────────────────────────────────────
    const paidY = totY + 38 + 14
    doc.rect(L, paidY, W, 46).fill('#f0fdf4')
    doc.moveTo(L, paidY).lineTo(R, paidY).lineWidth(2).stroke('#16a34a')
    doc.circle(L + 20, paidY + 23, 11).fill('#16a34a')
    // "OK" indicator — standard fonts don't support checkmark unicode reliably
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
      .text('OK', L + 13, paidY + 18)
    doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(12)
      .text('PAYMENT CONFIRMED', L + 38, paidY + 8)
    doc.fillColor('#374151').font('Helvetica').fontSize(8.5)
      .text(`${data.customerName} - Ref: ${data.paymentRef}`, L + 38, paidY + 27, { width: W - 46 })

    // ── 7. FOOTER ────────────────────────────────────────────────
    const footY = paidY + 46 + 14
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
      .text(
        `This is an official receipt from ${data.tenantName}. Please retain it for your records.`,
        L, footY, { width: W, align: 'center' },
      )

    // Bottom accent bar
    doc.rect(0, 827, 595, 15).fill('#4F46E5')

    doc.end()
  })
}

/**
 * Generates an HTML receipt for email delivery.
 * Matches the PDF layout: header, bill-to/order-details, items table with line totals, paid status.
 */
export function generateReceiptHtml(data: OrderReceiptData): string {
  const fmt = (kobo: number) =>
    `&#8358;${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const logoUrl = data.tenantLogoUrl ? resolveUrl(data.tenantLogoUrl) : null

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;color:#334155;">${item.name}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;">${item.quantity}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569;">${fmt(item.priceKobo)}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${fmt(item.priceKobo * item.quantity)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Receipt &#8212; ${data.tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:620px;margin:32px auto 48px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09);">
  <div style="background:#4F46E5;height:6px;"></div>

  <!-- Header -->
  <div style="padding:24px 32px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${data.tenantName}" style="height:50px;width:auto;object-fit:contain;border-radius:6px;">` : ''}
      <div>
        <div style="font-size:17px;font-weight:700;color:#0f172a;">${data.tenantName}</div>
        ${data.tenantAddress ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${data.tenantAddress}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:800;color:#4F46E5;letter-spacing:-0.5px;">RECEIPT</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px;">#${data.orderId.slice(0, 8).toUpperCase()}</div>
      <div style="font-size:11px;color:#94a3b8;">${data.paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- Bill To + Order Details -->
  <div style="padding:18px 32px;display:flex;justify-content:space-between;gap:24px;background:#fafbfc;border-bottom:1px solid #e2e8f0;">
    <div>
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.6px;margin-bottom:8px;">BILLED TO</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;">${data.customerName}</div>
      <div style="font-size:12px;color:#64748b;margin-top:3px;">${data.customerEmail}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.6px;margin-bottom:8px;">ORDER DETAILS</div>
      <table style="font-size:12px;color:#475569;border-collapse:collapse;">
        <tr>
          <td style="padding:2px 14px 2px 0;color:#94a3b8;">Order ID</td>
          <td style="font-weight:700;color:#0f172a;">#${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:2px 14px 2px 0;color:#94a3b8;">Date</td>
          <td>${data.paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding:2px 14px 2px 0;color:#94a3b8;">Reference</td>
          <td style="font-family:monospace;font-size:11px;">${data.paymentRef}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <div style="padding:20px 32px 0;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#475569;">DESCRIPTION</th>
          <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:#475569;">QTY</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:700;color:#475569;">UNIT PRICE</th>
          <th style="padding:10px 10px;text-align:right;font-size:11px;font-weight:700;color:#475569;">LINE TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:16px 10px;border-top:2px solid #4F46E5;font-size:13px;font-weight:600;color:#475569;">Total Amount Paid</td>
          <td style="padding:16px 10px;border-top:2px solid #4F46E5;text-align:right;font-size:18px;font-weight:800;color:#4F46E5;">${fmt(data.totalKobo)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Paid Status -->
  <div style="margin:18px 32px 0;background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:14px 18px;display:flex;align-items:flex-start;gap:12px;">
    <div style="flex-shrink:0;width:28px;height:28px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#16a34a;">PAYMENT CONFIRMED</div>
      <div style="font-size:11px;color:#374151;margin-top:3px;">${data.customerName} &mdash; Ref: <span style="font-family:monospace;">${data.paymentRef}</span></div>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:18px 32px 24px;text-align:center;">
    <div style="height:1px;background:#e2e8f0;margin-bottom:14px;"></div>
    <p style="margin:0;font-size:11px;color:#94a3b8;">Thank you for your purchase! This is an official receipt from <strong>${data.tenantName}</strong>. Please retain it for your records.</p>
  </div>
  <div style="background:#4F46E5;height:6px;"></div>
</div>
</body>
</html>`
}

/**
 * Generates an HTML order notification email for the tenant/owner.
 */
export function generateOrderNotificationHtml(data: OrderReceiptData): string {
  const fmt = (kobo: number) =>
    `&#8358;${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const itemRows = data.items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155;">${i.name}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;">${fmt(i.priceKobo * i.quantity)}</td>
    </tr>`,
  ).join('')
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>New Order &#8212; ${data.tenantName}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <div style="background:#4F46E5;padding:20px 28px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">New Order Received</h2>
    <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${data.tenantName}</p>
  </div>
  <div style="padding:24px 28px;">
    <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;">
      <table style="width:100%;border-collapse:collapse;color:#374151;">
        <tr><td style="padding:3px 0;color:#6b7280;">Customer</td><td style="font-weight:600;text-align:right;">${data.customerName}</td></tr>
        <tr><td style="padding:3px 0;color:#6b7280;">Email</td><td style="text-align:right;">${data.customerEmail}</td></tr>
        <tr><td style="padding:3px 0;color:#6b7280;">Order ID</td><td style="font-weight:600;text-align:right;">#${data.orderId.slice(0, 8).toUpperCase()}</td></tr>
        <tr><td style="padding:3px 0;color:#6b7280;">Date</td><td style="text-align:right;">${data.paidAt.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
      </table>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 0;text-align:left;color:#6b7280;font-weight:600;">Item</th>
          <th style="padding:8px 8px;text-align:center;color:#6b7280;font-weight:600;">Qty</th>
          <th style="padding:8px 0;text-align:right;color:#6b7280;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 0;font-weight:700;font-size:15px;color:#1e293b;border-top:2px solid #4F46E5;">TOTAL</td>
          <td style="padding:12px 0;font-weight:700;font-size:15px;color:#4F46E5;text-align:right;border-top:2px solid #4F46E5;">${fmt(data.totalKobo)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-top:20px;text-align:center;">
      <p style="margin:0;color:#16a34a;font-weight:700;font-size:13px;">PAYMENT CONFIRMED</p>
      <p style="margin:5px 0 0;font-size:11px;color:#6b7280;">Ref: ${data.paymentRef}</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f1f5f9;">
    Automated notification from ${data.tenantName} via Raven Enterprise
  </div>
</div>
</body>
</html>`
}
