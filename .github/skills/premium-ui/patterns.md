# Common UI Patterns

Reusable snippets for frequent UI needs.

## Pattern: Form with Submit Button

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'

export function MyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await api.post('/endpoint', formData)
      toast.success('Saved successfully!')
      setFormData({ name: '', email: '' }) // Reset on success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingText="Saving…"
      >
        Save
      </Button>
    </form>
  )
}
```

## Pattern: Delete Confirmation with Button

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'

export function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    
    try {
      await api.delete(`/endpoint/${id}`)
      toast.success('Deleted successfully')
      onDeleted()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="danger"
        isLoading={isDeleting}
        loadingText="Deleting…"
        onClick={handleDelete}
      >
        Confirm Delete
      </Button>
      <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
        Cancel
      </Button>
    </div>
  )
}
```

## Pattern: Navigation CTA Grid

```tsx
import Link from 'next/link'

const ctas = [
  {
    title: 'Create Tenant',
    description: 'Onboard a new business',
    href: '/tenants/create',
    icon: <PlusIcon className="h-4 w-4" />,
    iconBoxClass: 'bg-emerald-500/15 ring-1 ring-emerald-400/30',
    iconClass: 'text-emerald-400',
  },
  {
    title: 'View Reports',
    description: 'Analytics and insights',
    href: '/reports',
    icon: <ChartIcon className="h-4 w-4" />,
    iconBoxClass: 'bg-sky-500/15 ring-1 ring-sky-400/30',
    iconClass: 'text-sky-400',
  },
  {
    title: 'Settings',
    description: 'Platform configuration',
    href: '/settings',
    icon: <CogIcon className="h-4 w-4" />,
    iconBoxClass: 'bg-slate-500/15 ring-1 ring-slate-400/30',
    iconClass: 'text-slate-400',
  },
]

export function CTAGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ctas.map((cta) => (
        <Link key={cta.href} href={cta.href} className="block">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cta.iconBoxClass}`}>
                <span className={cta.iconClass}>{cta.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{cta.title}</p>
                <p className="text-xs text-slate-400">{cta.description}</p>
              </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          </div>
        </Link>
      ))}
    </div>
  )
}
```

## Pattern: Shimmer-First Table

```tsx
'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface Item {
  id: string
  name: string
  email: string
  status: string
}

export function ItemsTable() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      setIsLoading(true)
      try {
        const data = await api.get<Item[]>('/items')
        setItems(data)
      } catch {
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [])

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
                  </td>
                </tr>
              ))
            : items.length === 0
            ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )
            : items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.email}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}
```

## Pattern: Shimmer-First Grid

```tsx
'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export function ItemsGrid() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadItems() {
      setIsLoading(true)
      try {
        const data = await api.get('/items')
        setItems(data)
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer" />
            </div>
          ))
        : items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))
      }
    </div>
  )
}
```

## Pattern: Modal with Action Button

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Dialog } from '@headlessui/react'

export function ActionModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [isConfirming, setIsConfirming] = useState(false)

  async function handleConfirm() {
    setIsConfirming(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Confirm Action
          </Dialog.Title>
          
          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to proceed? This action cannot be undone.
          </Dialog.Description>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={isConfirming}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isConfirming}
              loadingText="Processing…"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
```

## Pattern: Status Badge

```tsx
const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20',
    dotClassName: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20',
    dotClassName: 'bg-amber-500',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20',
    dotClassName: 'bg-slate-500',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/20',
    dotClassName: 'bg-red-500',
  },
}

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status] || statusConfig.inactive

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`} />
      {config.label}
    </span>
  )
}
```

## Pattern: Empty State with CTA

```tsx
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
        <InboxIcon className="h-8 w-8 text-slate-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No items yet
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Get started by creating your first item. You can manage everything from here.
      </p>

      <Link href="/create">
        <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <PlusIcon className="h-4 w-4" />
          Create Item
        </div>
      </Link>
    </div>
  )
}
```

## Pattern: Page Header with Action

```tsx
import { Button } from '@/components/Button'

export function PageHeader({ title, description, onAction, isLoading }: {
  title: string
  description?: string
  onAction?: () => void
  isLoading?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      
      {onAction && (
        <Button
          isLoading={isLoading}
          loadingText="Creating…"
          onClick={onAction}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create
        </Button>
      )}
    </div>
  )
}
```

## Usage

Copy-paste these patterns and customize:
- Replace `api.get/post/delete` with actual endpoints
- Replace `Item` interface with your data type
- Replace `toast` with your notification system
- Adjust Tailwind classes for your theme
- Add proper TypeScript types
