'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants'
import AuthenticatedImage from '@/components/AuthenticatedImage'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: 'SUPER_ADMIN' | 'admin'
  scope: 'SYSTEM' | 'TENANT'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

interface UsersMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UsersResponse {
  data: AdminUser[]
  meta: UsersMeta
}

interface UserFormData {
  email: string
  name: string
  password: string
  role: 'SUPER_ADMIN' | 'admin'
}

const emptyForm: UserFormData = { email: '', name: '', password: '', role: 'SUPER_ADMIN' }

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border border-purple-200',
  admin: 'bg-blue-100 text-blue-800 border border-blue-200',
}

function Avatar({ user }: { user: AdminUser }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {user.avatar_url ? (
        <AuthenticatedImage src={`${API_BASE_URL}${user.avatar_url}`} alt={user.name || user.email} className="w-9 h-9 rounded-full object-cover" />
      ) : initials}
    </div>
  )
}

function UserModal({
  mode,
  user,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  user?: AdminUser
  onClose: () => void
  onSave: (data: UserFormData) => Promise<void>
}) {
  const [form, setForm] = useState<UserFormData>(
    user ? { email: user.email, name: user.name ?? '', password: '', role: user.role } : emptyForm,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.email) return setError('Email is required')
    if (mode === 'create' && !form.password) return setError('Password is required')
    if (form.password && form.password.length < 8) return setError('Password must be at least 8 characters')
    setSaving(true)
    try {
      await onSave(form)
    } catch (err: any) {
      setError(err?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? 'Create Admin User' : 'Edit Admin User'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Display name (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {mode === 'create' ? 'Password *' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Min 8 characters'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserFormData['role'] })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN — Full platform access</option>
              <option value="admin">admin — Limited admin access</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [meta, setMeta] = useState<UsersMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: AdminUser } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await api.get<UsersResponse>(`${API_ENDPOINTS.ADMIN_USERS}?${params}`)
      setUsers(res.data)
      setMeta(res.meta)
    } catch (err: any) {
      setError(err?.message || 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [search, roleFilter])

  const handleCreate = async (form: UserFormData) => {
    await api.post(API_ENDPOINTS.ADMIN_USERS, {
      email: form.email,
      name: form.name || undefined,
      password: form.password,
      role: form.role,
    })
    setModal(null)
    showToast('success', 'User created successfully')
    load()
  }

  const handleEdit = async (form: UserFormData) => {
    if (!modal?.user) return
    const body: any = { name: form.name, email: form.email, role: form.role }
    if (form.password) body.password = form.password
    await api.patch(`${API_ENDPOINTS.ADMIN_USERS}/${modal.user.id}`, body)
    setModal(null)
    showToast('success', 'User updated successfully')
    load()
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    setDeletingId(user.id)
    try {
      await api.delete(`${API_ENDPOINTS.ADMIN_USERS}/${user.id}`)
      showToast('success', `${user.email} deleted`)
      load()
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            {meta ? `${meta.total} system-scope admin account${meta.total !== 1 ? 's' : ''}` : 'Manage platform admins'}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Admin User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="admin">admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            <p className="text-slate-600 text-sm">{error}</p>
            <button onClick={load} className="text-blue-600 text-sm hover:underline">Retry</button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H4v-1a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <p className="text-slate-500 text-sm">No admin users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Created</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <p className="font-medium text-slate-900">{user.name || '—'}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal({ mode: 'edit', user })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === user.id ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          onClose={() => setModal(null)}
          onSave={modal.mode === 'create' ? handleCreate : handleEdit}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
