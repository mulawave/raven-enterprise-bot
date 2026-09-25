"use client"

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface Faq {
  id: string
  question: string
  answer: string
  sort_order: number
  created_at: string
}

function RowShimmer() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
      <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
    </div>
  )
}

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addQ, setAddQ] = useState('')
  const [addA, setAddA] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) { setIsLoading(true); setError(null) }
    try {
      const data = await api<Faq[]>('/api/faqs')
      setFaqs(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load FAQs. Check your connection and try again.')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!addQ.trim() || !addA.trim()) return
    setIsSaving(true)
    setActionError(null)
    try {
      await api('/api/faqs', {
        method: 'POST',
        body: JSON.stringify({ question: addQ.trim(), answer: addA.trim(), sort_order: faqs.length }),
      })
      setAddQ(''); setAddA(''); setShowAdd(false)
      await load(true)
    } catch {
      setActionError('Failed to save FAQ. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editId || !editQ.trim() || !editA.trim()) return
    setIsUpdating(true)
    setActionError(null)
    try {
      await api(`/api/faqs/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({ question: editQ.trim(), answer: editA.trim() }),
      })
      setEditId(null)
      await load(true)
    } catch {
      setActionError('Failed to update FAQ. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api(`/api/faqs/${id}`, { method: 'DELETE' })
      if (editId === id) setEditId(null)
      await load(true)
    } catch {
      setActionError('Failed to delete FAQ. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(f: Faq) {
    setEditId(f.id)
    setEditQ(f.question)
    setEditA(f.answer)
    setShowAdd(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${faqs.length} question${faqs.length !== 1 ? 's' : ''} · used by your AI bot to answer customers`}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setActionError(null) }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add FAQ
        </button>
      </div>

      {/* Load error banner */}
      {error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => load()} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
            Retry
          </button>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-700">{actionError}</p>
          <button onClick={() => setActionError(null)} className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-700">
          FAQs are part of the knowledge base your website assistant uses to answer customer questions. Add your most common questions and their answers here so the widget can respond with stronger coverage. Configure it in <a href="/bots" className="font-semibold underline">Website Assistant settings</a>.
        </p>
      </div>

      {/* Add FAQ form */}
      {showAdd && (
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-900">New FAQ</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Question *</label>
            <input
              value={addQ}
              onChange={(e) => setAddQ(e.target.value)}
              placeholder="e.g. What are your opening hours?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Answer *</label>
            <textarea
              value={addA}
              onChange={(e) => setAddA(e.target.value)}
              rows={3}
              placeholder="e.g. We are open Monday to Friday, 9am to 6pm."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={!addQ.trim() || !addA.trim() || isSaving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSaving && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isSaving ? 'Saving…' : 'Add FAQ'}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FAQ list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <RowShimmer key={i} />)
        ) : faqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200 mx-auto mb-3">
              <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No FAQs yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first FAQ to strengthen website assistant answers.</p>
            <button onClick={() => setShowAdd(true)} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              Add your first FAQ
            </button>
          </div>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {editId === faq.id ? (
                <div className="p-4 space-y-3 bg-indigo-50 border-l-4 border-indigo-500">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question</label>
                    <input
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      value={editA}
                      onChange={(e) => setEditA(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={!editQ.trim() || !editA.trim() || isUpdating}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isUpdating && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {isUpdating ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditId(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Q: {faq.question}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">A: {faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEdit(faq)} disabled={deletingId === faq.id} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        disabled={deletingId === faq.id}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingId === faq.id && <span className="h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />}
                        {deletingId === faq.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
