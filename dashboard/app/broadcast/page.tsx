'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'

const CHANNELS = [
  { id: 'whatsapp',  label: 'WhatsApp',  icon: '💬', available: true },
  { id: 'instagram', label: 'Instagram', icon: '📸', available: false },
  { id: 'facebook',  label: 'Facebook',  icon: '📘', available: false },
]

const MAX_CHARS = 1024

interface BroadcastResult {
  sent: number
  failed: number
  total: number
  message?: string
  channel?: string
}

export default function BroadcastPage() {
  const { tenant } = useTenantContext()
  const [channel, setChannel] = useState('whatsapp')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const charsLeft = MAX_CHARS - message.length
  const canSend = message.trim().length > 0 && !isSending

  const handleSend = async () => {
    if (!canSend) return
    if (!window.confirm(`Send this broadcast to all your WhatsApp contacts? This cannot be undone.`)) return

    setIsSending(true)
    setResult(null)
    setError(null)

    try {
      const data = await api<BroadcastResult>(
        `/api/broadcast/send`,
        {
          method: 'POST',
          body: JSON.stringify({ channel, message: message.trim() }),
        }
      )
      setResult(data)
      setMessage('')
    } catch {
      setError('Failed to send broadcast. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Broadcast</h1>
      <p className="text-sm text-gray-500 mb-8">
        Send a message to all customers on a channel
      </p>

      {/* Success banner */}
      {result && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <span>✓</span>
          <span>
            Broadcast queued on <strong>{result.channel ?? channel}</strong> — {result.sent} message{result.sent !== 1 ? 's' : ''} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {/* Channel selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Channel
          </label>
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                disabled={!ch.available}
                onClick={() => ch.available && setChannel(ch.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                  !ch.available
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
                    : channel === ch.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span>{ch.icon}</span>
                {ch.label}
                {!ch.available && <span className="text-xs text-gray-400 ml-1">(Soon)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Message textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="broadcast-message">
            Message
          </label>
          <textarea
            id="broadcast-message"
            rows={6}
            maxLength={MAX_CHARS}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your broadcast message here…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
          <p className={`mt-1 text-xs text-right ${charsLeft < 50 ? 'text-amber-600' : 'text-gray-400'}`}>
            {charsLeft.toLocaleString()} characters remaining
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                </svg>
                Sending…
              </>
            ) : (
              'Send Broadcast'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
