"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Contact {
  id: string
  name: string
  phone: string
  notes: string | null
  createdAt: string
  conversation: { id: string; status: string } | null
}

function RowShimmer() {
  return (
    <tr className="border-b border-gray-100">
      {[40, 28, 20, 16, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3.5 w-${w} rounded bg-gray-200 animate-pulse`} />
        </td>
      ))}
    </tr>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await api<Contact[]>('/api/contacts')
      setContacts(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!addName.trim() || !addPhone.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      await api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name: addName.trim(), phone: addPhone.trim(), notes: addNotes.trim() || undefined }),
      })
      setAddName(''); setAddPhone(''); setAddNotes(''); setShowAdd(false)
      await load(true)
    } catch (e: any) {
      setError(e?.message?.includes('already exists') ? 'A contact with this number already exists.' : 'Failed to save contact.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEdit() {
    if (!editId || !editName.trim()) return
    setIsEditing(true)
    try {
      await api(`/api/contacts/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), notes: editNotes.trim() || null }),
      })
      setEditId(null)
      await load(true)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update contact.')
    } finally {
      setIsEditing(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api(`/api/contacts/${id}`, { method: 'DELETE' })
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Failed to delete contact.')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(c: Contact) {
    setEditId(c.id)
    setEditName(c.name)
    setEditNotes(c.notes ?? '')
    setShowAdd(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${contacts.length} saved contacts`}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setError(null) }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Add contact form */}
      {showAdd && (
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900 mb-3">New Contact</p>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="e.g. +2348012345678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || !addPhone.trim() || isSaving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSaving && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isSaving ? 'Saving…' : 'Save Contact'}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Chat</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <RowShimmer key={i} />)
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
                      <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">No contacts yet</p>
                    <p className="text-xs text-gray-400">Save contacts from conversations, or add one manually above.</p>
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const hasOpenConv = contact.conversation?.status === 'open'
                const hasAnyConv = !!contact.conversation
                return (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {editId === contact.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-indigo-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">{contact.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{contact.phone}</td>
                    <td className="px-4 py-3">
                      {editId === contact.id ? (
                        <input
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">{contact.notes ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/conversations?phone=${encodeURIComponent(contact.phone)}`}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          hasOpenConv
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {hasOpenConv ? 'Continue Chatting' : hasAnyConv ? 'Start Chat' : 'Start Chat'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editId === contact.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={handleEdit}
                            disabled={isEditing}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {isEditing && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {isEditing ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditId(null)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => startEdit(contact)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            disabled={deletingId === contact.id}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                          >
                            {deletingId === contact.id && <span className="h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />}
                            {deletingId === contact.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
