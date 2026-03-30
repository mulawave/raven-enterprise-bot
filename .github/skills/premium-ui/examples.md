# Component Upgrade Examples

Real before/after examples showing how to convert amateur UI to royal-grade standards.

## Example 1: Simple Button → Stateful Button

### ❌ Before (Amateur)
```tsx
function SaveButton({ data }) {
  async function handleSave() {
    await api.post('/save', data)
    alert('Saved!')
  }

  return <button onClick={handleSave}>Save</button>
}
```

**Problems**:
- No loading state (user can click multiple times)
- No visual feedback during save
- Not disabled during async operation
- Alert instead of toast
- No error handling

### ✅ After (Royal-Grade)
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { toast } from 'react-hot-toast'

function SaveButton({ data }) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      await api.post('/save', data)
      toast.success('Saved successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button 
      isLoading={isSaving} 
      loadingText="Saving…"
      onClick={handleSave}
    >
      Save
    </Button>
  )
}
```

---

## Example 2: Bare Link → Sophisticated CTA Card

### ❌ Before (Amateur)
```tsx
<div>
  <p>Don't have an account?</p>
  <Link href="/register" className="text-blue-500 underline">
    Sign up here
  </Link>
</div>
```

**Problems**:
- Bare text link (not sophisticated)
- No icon
- No visual hierarchy
- Looks like a blog, not a SaaS platform

### ✅ After (Royal-Grade)
```tsx
<Link href="/register" className="block">
  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/10">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
        <UserPlusIcon className="h-4 w-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white">Create Account</p>
        <p className="text-xs text-slate-400">Get started with a new account</p>
      </div>
    </div>
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
      Sign up <ChevronRightIcon className="h-3 w-3" />
    </div>
  </div>
</Link>
```

---

## Example 3: Full-Page Loader → Shimmer-First

### ❌ Before (Amateur)
```tsx
'use client'

import { useState, useEffect } from 'react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/tenants').then((data) => {
      setTenants(data)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Tenants</h1>
      <table>
        {tenants.map((t) => (
          <tr key={t.id}>
            <td>{t.name}</td>
          </tr>
        ))}
      </table>
    </div>
  )
}
```

**Problems**:
- Full-page conditional return (layout flash)
- No structure visible while loading
- Text "Loading..." (unprofessional)
- No error handling

### ✅ After (Royal-Grade)
```tsx
'use client'

import { useState, useEffect } from 'react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTenants() {
      setIsLoading(true)
      try {
        const data = await api.get('/tenants')
        setTenants(data)
      } catch {
        setTenants([])
      } finally {
        setIsLoading(false)
      }
    }
    loadTenants()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tenants</h1>
      
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
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
            : tenants.length === 0
            ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No tenants found
                  </td>
                </tr>
              )
            : tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-6 py-4 text-sm">{tenant.name}</td>
                  <td className="px-6 py-4 text-sm">{tenant.email}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={tenant.status} />
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

---

## Example 4: Multiple CTAs → Sophisticated Grid

### ❌ Before (Amateur)
```tsx
<div>
  <h2>Quick Actions</h2>
  <ul>
    <li><Link href="/tenants/create">Create Tenant</Link></li>
    <li><Link href="/reports">View Reports</Link></li>
    <li><Link href="/settings">Settings</Link></li>
  </ul>
</div>
```

**Problems**:
- Bare bullet list
- No icons
- No visual hierarchy
- Looks like documentation, not a dashboard

### ✅ After (Royal-Grade)
```tsx
const quickActions = [
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
    icon: <ChartBarIcon className="h-4 w-4" />,
    iconBoxClass: 'bg-sky-500/15 ring-1 ring-sky-400/30',
    iconClass: 'text-sky-400',
  },
  {
    title: 'Platform Settings',
    description: 'Configure system',
    href: '/settings',
    icon: <CogIcon className="h-4 w-4" />,
    iconBoxClass: 'bg-slate-500/15 ring-1 ring-slate-400/30',
    iconClass: 'text-slate-400',
  },
]

export function QuickActions() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="block">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.iconBoxClass}`}>
                  <span className={action.iconClass}>{action.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{action.title}</p>
                  <p className="text-xs text-slate-400">{action.description}</p>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Example 5: Form with Delete → Stateful Form + Confirmation

### ❌ Before (Amateur)
```tsx
function TenantForm({ tenant }) {
  function handleDelete() {
    if (confirm('Delete?')) {
      api.delete(`/tenants/${tenant.id}`)
      window.location.reload()
    }
  }

  return (
    <div>
      <input defaultValue={tenant.name} />
      <button onClick={handleDelete}>Delete</button>
    </div>
  )
}
```

**Problems**:
- Native `confirm()` dialog (unprofessional)
- No loading state on delete
- Page reload (jarring UX)
- No error handling

### ✅ After (Royal-Grade)
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

function TenantForm({ tenant }: { tenant: Tenant }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    
    try {
      await api.delete(`/tenants/${tenant.id}`)
      toast.success('Tenant deleted successfully')
      router.push('/tenants')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tenant'
      toast.error(message)
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-4">
      <input 
        defaultValue={tenant.name}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />

      {!showConfirm ? (
        <Button variant="danger" onClick={() => setShowConfirm(true)}>
          Delete Tenant
        </Button>
      ) : (
        <div className="flex gap-3 items-center">
          <p className="text-sm text-gray-600">Are you sure? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              isLoading={isDeleting}
              loadingText="Deleting…"
              onClick={handleDelete}
            >
              Confirm Delete
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Key Improvements Summary

| Before | After |
|--------|-------|
| Plain `<button>` | `<Button isLoading loadingText>` |
| Bare text link | Sophisticated card with icon, labels, badge |
| `if (isLoading) return` | Shell renders, data shimmers |
| `alert()` / `confirm()` | Toast notifications, inline confirmation |
| No error handling | Try-catch with user feedback |
| `window.location.reload()` | Router navigation |
| No TypeScript types | Proper interfaces |
| Inconsistent styling | Theme-consistent classes |

## Conversion Time Estimates

| Component Type | Amateur → Royal-Grade | Effort |
|----------------|----------------------|--------|
| Single button | 2-5 minutes | Low |
| Single CTA link | 5-10 minutes | Low |
| Full page loader | 10-15 minutes | Medium |
| Form with actions | 20-30 minutes | Medium |
| Complex dashboard | 1-2 hours | High |

Use these examples as templates when upgrading existing components.
