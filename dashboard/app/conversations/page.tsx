"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api, apiUpload } from '@/lib/api'
import { formatDate } from '@/lib/formatters'

interface Conversation {
  id: string
  customerId: string
  customerName: string
  customerPhone: string | null
  messagesCount: number
  lastMessageAt: string
  lastMessage: string
  lastMessageBy: string
  status: string
  botOverride: boolean
}

interface Message {
  id: string
  content: string
  senderType: string
  senderId: string | null
  createdAt: string
}

interface Contact {
  id: string
  name: string
  phone: string
}

interface WaInfo {
  phoneNumberId: string | null
  isConfigured: boolean
}

// ─── Toast notification ──────────────────────────────────────────────────────

interface ToastState {
  message: string
  type: 'success' | 'error'
  id: number
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl border ${
        toast.type === 'success'
          ? 'bg-emerald-600 text-white border-emerald-500'
          : 'bg-red-600 text-white border-red-500'
      }`}
    >
      {toast.type === 'success' ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      {toast.message}
    </div>
  )
}

// ─── Shimmer helpers ────────────────────────────────────────────────────────

function ConvRowShimmer() {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-gray-100">
      <div className="h-3.5 w-2/3 rounded bg-gray-200 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
    </div>
  )
}

function MsgBubbleShimmer({ right }: { right?: boolean }) {
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`h-10 w-48 rounded-2xl bg-gray-200 animate-pulse ${right ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
    </div>
  )
}

// ─── Media content parser ────────────────────────────────────────────────────

interface MediaContent {
  __media: true
  type: 'image' | 'audio' | 'video' | 'document'
  url: string
  filename: string
  caption: string
}

function parseMedia(content: string): MediaContent | null {
  if (!content.startsWith('{') || !content.includes('"__media"')) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed.__media === true) return parsed as MediaContent
  } catch { /* fall through */ }
  return null
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isBot = msg.senderType === 'bot' || msg.senderType === 'system'
  const isCustomer = msg.senderType === 'customer'
  const isHuman = msg.senderType === 'human'
  const isRight = isBot || isHuman

  const media = parseMedia(msg.content)

  const bubbleClass = isBot
    ? 'bg-indigo-600 text-white rounded-br-sm'
    : isHuman
    ? 'bg-emerald-600 text-white rounded-br-sm'
    : isCustomer
    ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
    : 'bg-amber-50 border border-amber-200 text-amber-800 rounded-sm text-xs italic'

  const timeClass = isRight ? (isHuman ? 'text-emerald-200' : 'text-indigo-200') : 'text-gray-400'
  const senderLabel = isBot ? 'Bot' : isHuman ? 'Agent' : isCustomer ? 'Customer' : msg.senderType

  return (
    <div className={`flex mb-3 ${isRight ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleClass}`}>
        {media ? (
          <div className="space-y-1.5">
            {media.type === 'image' && (
              <img
                src={media.url}
                alt={media.filename}
                className="rounded-lg max-w-full max-h-64 object-contain"
              />
            )}
            {media.type === 'audio' && (
              <audio controls src={media.url} className="max-w-full w-56" />
            )}
            {media.type === 'video' && (
              <video controls src={media.url} className="rounded-lg max-w-full max-h-48" />
            )}
            {media.type === 'document' && (
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 underline underline-offset-2"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                {media.filename}
              </a>
            )}
            {media.caption && <p className="text-xs opacity-90">{media.caption}</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}
        <p className={`text-[10px] mt-1 ${timeClass}`}>
          {senderLabel} · {formatDate(msg.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700',
    resolved: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
    escalated: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status === 'escalated' ? '🔴 escalated' : status}
    </span>
  )
}

// ─── Empty inbox state ───────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 mb-4">
        <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-gray-800 mb-1">No conversations yet</p>
      <p className="text-sm text-gray-500 mb-5 max-w-xs">
        When customers message your WhatsApp number, their conversations will appear here.
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left max-w-sm w-full">
        <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Setup required
        </p>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>Go to Settings &#x2192; WhatsApp &amp; AI to save your keys</li>
          <li>Set Meta Callback URL to your API webhook endpoint</li>
          <li>Subscribe to the <strong>messages</strong> webhook field in Meta</li>
          <li>Go to Bots to configure and enable your AI assistant</li>
        </ol>
        <a href="/settings" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
          Open Settings &#x2192;
        </a>
      </div>
    </div>
  )
}

// ─── Save as Contact pane ────────────────────────────────────────────────────

function SaveContactPane({
  phone,
  onSave,
  onClose,
}: {
  phone: string
  onSave: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim())
    } catch {
      setError('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-b-xl shadow-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-2">
        Save <span className="font-medium text-gray-700">{phone}</span> as a contact:
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder="e.g. John Adeyemi"
          autoFocus
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
        >
          {saving && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 shrink-0"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  return (
    <Suspense fallback={null}>
      <ConversationsInner />
    </Suspense>
  )
}

function ConversationsInner() {
  const searchParams = useSearchParams()
  const phoneFilter = searchParams.get('phone')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConvs, setIsLoadingConvs] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'escalated'>('all')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [waInfo, setWaInfo] = useState<WaInfo | null>(null)
  const [showSaveContact, setShowSaveContact] = useState(false)

  // Reply box state
  const [sendText, setSendText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isTogglingOverride, setIsTogglingOverride] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastCounter = useRef(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    toastCounter.current += 1
    setToast({ message, type, id: toastCounter.current })
  }, [])

  const handleToastClose = useCallback(() => setToast(null), [])

  // Contact display name helper — prefer saved contact name over raw customerName
  function displayName(conv: Conversation): string {
    const contact = contacts.find((c) => c.phone === conv.customerPhone)
    return contact?.name ?? conv.customerName
  }

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingConvs(true)
    try {
      const data = await api<Conversation[]>('/api/messaging/conversations')
      setConversations(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setIsLoadingConvs(false)
    }
  }, [])

  const loadMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setIsLoadingMsgs(true)
    try {
      const data = await api<Message[]>(`/api/messaging/conversations/${id}/messages`)
      setMessages(Array.isArray(data) ? data : [])
    } catch { setMessages([]) } finally { setIsLoadingMsgs(false) }
  }, [])

  const loadContacts = useCallback(async () => {
    try {
      const data = await api<Contact[]>('/api/contacts')
      setContacts(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [])

  const loadWaInfo = useCallback(async () => {
    try {
      const data = await api<WaInfo>('/api/settings/wa-info')
      setWaInfo(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadConversations()
    loadContacts()
    loadWaInfo()
  }, [loadConversations, loadContacts, loadWaInfo])

  // Auto-select by ?phone= query param
  useEffect(() => {
    if (phoneFilter && conversations.length > 0 && !selectedId) {
      const match = conversations.find((c) => c.customerPhone === phoneFilter)
      if (match) setSelectedId(match.id)
    }
  }, [phoneFilter, conversations, selectedId])

  // Auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(() => {
      loadConversations(true)
      loadContacts()
      if (selectedId) loadMessages(selectedId, true)
    }, 10_000)
    return () => clearInterval(id)
  }, [loadConversations, loadContacts, loadMessages, selectedId])

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null
  const filtered = conversations.filter((c) => filter === 'all' || c.status === filter)
  const openCount = conversations.filter((c) => c.status === 'open').length
  const contactForSelected = selectedConversation?.customerPhone
    ? contacts.find((c) => c.phone === selectedConversation.customerPhone) ?? null
    : null

  async function toggleStatus() {
    if (!selectedId || !selectedConversation) return
    const next = selectedConversation.status === 'open' ? 'resolved' : 'open'
    setUpdatingStatus(true)
    try {
      await api(`/api/messaging/conversations/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, status: next } : c))
    } catch { showToast('Failed to update status', 'error') } finally { setUpdatingStatus(false) }
  }

  async function saveAsContact(name: string) {
    if (!selectedConversation?.customerPhone) return
    try {
      await api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, phone: selectedConversation.customerPhone }),
      })
      await loadContacts()
      setShowSaveContact(false)
      showToast('Contact saved successfully!', 'success')
    } catch (err: any) {
      if (err?.message?.includes('409')) {
        await loadContacts()
        setShowSaveContact(false)
        showToast('Contact already saved', 'success')
      } else {
        throw err
      }
    }
  }

  async function toggleOverride() {
    if (!selectedId || !selectedConversation || isTogglingOverride) return
    const newValue = !selectedConversation.botOverride
    setIsTogglingOverride(true)
    try {
      await api(`/api/messaging/conversations/${selectedId}/override`, {
        method: 'PATCH',
        body: JSON.stringify({ override: newValue }),
      })
      setConversations((prev) =>
        prev.map((c) => c.id === selectedId ? { ...c, botOverride: newValue } : c)
      )
      showToast(
        newValue ? 'Bot paused — you are now managing this chat' : 'Bot re-enabled',
        'success',
      )
    } catch { showToast('Failed to toggle override', 'error') } finally { setIsTogglingOverride(false) }
  }

  async function handleSend() {
    if (!selectedId || !sendText.trim() || isSending) return
    setIsSending(true)
    const text = sendText.trim()
    setSendText('')
    try {
      const msg = await api<Message>(`/api/messaging/conversations/${selectedId}/send`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      })
      setMessages((prev) => [...prev, msg])
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessage: text, lastMessageAt: msg.createdAt, lastMessageBy: 'human' }
            : c
        )
      )
    } catch (err: any) {
      setSendText(text)
      showToast(err?.message ?? 'Failed to send message', 'error')
    } finally { setIsSending(false) }
  }

  async function handleSendMedia() {
    if (!selectedId || !selectedFile || isSending) return
    setIsSending(true)
    const file = selectedFile
    setSelectedFile(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const msg = await apiUpload<Message>(
        `/api/messaging/conversations/${selectedId}/send-media`,
        formData,
      )
      setMessages((prev) => [...prev, msg])
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessage: `[${file.type.split('/')[0]}]`, lastMessageAt: msg.createdAt, lastMessageBy: 'human' }
            : c
        )
      )
    } catch (err: any) {
      setSelectedFile(file)
      showToast(err?.message ?? 'Failed to send file', 'error')
    } finally { setIsSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {toast && (
        <Toast key={toast.id} toast={toast} onClose={handleToastClose} />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoadingConvs ? 'Loading…' : `${conversations.length} total · ${openCount} open`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {waInfo && (
            <div className={`hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${waInfo.isConfigured ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {waInfo.isConfigured
                ? <span>WhatsApp · <span className="font-mono">{waInfo.phoneNumberId}</span></span>
                : 'WhatsApp not configured'
              }
            </div>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'open', 'escalated', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-panel layout */}
      <div className="flex flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden min-h-0">
        {/* Left: conversation list */}
        <div className={`w-full lg:w-80 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConvs ? (
              Array.from({ length: 7 }).map((_, i) => <ConvRowShimmer key={i} />)
            ) : filtered.length === 0 ? (
              <EmptyInbox />
            ) : (
              filtered.map((conv) => {
                const name = displayName(conv)
                const isContact = contacts.some((c) => c.phone === conv.customerPhone)
                return (
                  <button
                    key={conv.id}
                    onClick={() => { setSelectedId(conv.id); setShowSaveContact(false) }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${selectedId === conv.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight flex items-center gap-1.5">
                        {name}
                        {isContact && (
                          <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                            Saved
                          </span>
                        )}
                        {conv.botOverride && (
                          <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                            Human
                          </span>
                        )}
                      </p>
                      <StatusBadge status={conv.status} />
                    </div>
                    {conv.customerPhone && <p className="text-xs text-gray-400 mb-0.5">{conv.customerPhone}</p>}
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-500 truncate">
                        {conv.lastMessageBy === 'bot' ? '🤖 ' : conv.lastMessageBy === 'human' ? '👤 ' : ''}{conv.lastMessage}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(conv.lastMessageAt)}</p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: message thread */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200 mb-3">
                <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Select a conversation</p>
              <p className="text-xs text-gray-400 mt-1">Choose a conversation from the left to view messages</p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="relative shrink-0">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile back button */}
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="p-1 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors lg:hidden shrink-0"
                      aria-label="Back to conversations"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{displayName(selectedConversation)}</p>
                      {contactForSelected && (
                        <span className="text-xs text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 ring-1 ring-indigo-200 font-medium">
                          ★ {contactForSelected.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedConversation.customerPhone && (
                        <p className="text-xs text-gray-400">{selectedConversation.customerPhone}</p>
                      )}
                      <StatusBadge status={selectedConversation.status} />
                      <span className="text-xs text-gray-400">· {selectedConversation.messagesCount} messages</span>
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                    {/* Bot override toggle */}
                    <button
                      onClick={toggleOverride}
                      disabled={isTogglingOverride}
                      title={selectedConversation.botOverride ? 'Bot is paused — click to re-enable' : 'Click to pause bot and reply manually'}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
                        selectedConversation.botOverride
                          ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {isTogglingOverride ? (
                        <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : selectedConversation.botOverride ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {selectedConversation.botOverride ? <><span className="hidden sm:inline">Bot paused</span><span className="sm:hidden">Paused</span></> : <><span className="hidden sm:inline">Pause bot</span><span className="sm:hidden">Pause</span></>}
                    </button>

                    {/* Save contact button */}
                    {selectedConversation.customerPhone && !contactForSelected && (
                      <button
                        onClick={() => setShowSaveContact((v) => !v)}
                        className="rounded-lg border border-gray-200 px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="hidden sm:inline">Save contact</span>
                      </button>
                    )}

                    {/* Status toggle */}
                    <button
                      onClick={toggleStatus}
                      disabled={updatingStatus}
                      className={`rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        selectedConversation.status === 'open'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {updatingStatus ? (
                        <span className="flex items-center gap-1">
                          <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Updating…
                        </span>
                      ) : selectedConversation.status === 'open' ? 'Mark resolved' : 'Reopen'}
                    </button>
                  </div>
                </div>

                {showSaveContact && selectedConversation.customerPhone && (
                  <SaveContactPane
                    phone={selectedConversation.customerPhone}
                    onSave={saveAsContact}
                    onClose={() => setShowSaveContact(false)}
                  />
                )}
              </div>

              {/* Bot override active banner */}
              {selectedConversation.botOverride && (
                <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
                  <svg className="h-3.5 w-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-xs text-amber-700 font-medium">
                    Bot is paused — you are managing this conversation. Bot will auto-resume 60 seconds after the next customer message if you don&apos;t reply.
                  </p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50">
                {isLoadingMsgs ? (
                  Array.from({ length: 6 }).map((_, i) => <MsgBubbleShimmer key={i} right={i % 2 === 0} />)
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-sm text-gray-400">No messages in this conversation yet</p>
                  </div>
                ) : (
                  messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
                {/* File preview */}
                {selectedFile && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    <span className="text-xs text-gray-700 truncate flex-1">{selectedFile.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setSelectedFile(file)
                      e.target.value = ''
                    }}
                  />

                  {/* Attach button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    title="Attach image, audio, or video"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>

                  {/* Message textarea */}
                  <textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending || !!selectedFile}
                    placeholder={
                      selectedFile
                        ? 'File selected — click Send to upload'
                        : selectedConversation.botOverride
                        ? 'Type a message… (Enter to send, Shift+Enter for new line)'
                        : 'Type a message… Bot is active — pause bot first to reply manually'
                    }
                    rows={1}
                    className={`flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed ${
                      selectedFile
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                  />

                  {/* Send button */}
                  <button
                    onClick={selectedFile ? handleSendMedia : handleSend}
                    disabled={isSending || (!sendText.trim() && !selectedFile)}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                    {isSending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
