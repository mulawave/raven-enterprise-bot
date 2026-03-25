"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'
import { formatNaira } from '@/lib/formatters'

interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price_kobo: number
  available: boolean
  category_id: string
}

interface ToastState {
  message: string
  type: 'success' | 'error'
  id: number
}

function Shimmer({ className }: { className: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
        toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {toast.type === 'success' ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      )}
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-75 hover:opacity-100">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function CataloguePage() {
  const { tenant } = useTenantContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [isLoadingCats, setIsLoadingCats] = useState(true)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastCounter = useRef(0)

  // Category form
  const [showAddCat, setShowAddCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [isSavingCat, setIsSavingCat] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [isUpdatingCat, setIsUpdatingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  // Item form
  const [showAddItem, setShowAddItem] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemDesc, setEditItemDesc] = useState('')
  const [editItemPrice, setEditItemPrice] = useState('')
  const [isUpdatingItem, setIsUpdatingItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    toastCounter.current += 1
    setToast({ message, type, id: toastCounter.current })
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadCategories = useCallback(async (autoSelectFirst = false) => {
    if (!tenant?.id) return
    setIsLoadingCats(true)
    try {
      const data = await api<Category[]>(`/api/ordering/menu/categories?tenantId=${tenant.id}`)
      const cats = Array.isArray(data) ? data : []
      setCategories(cats)
      if (autoSelectFirst && cats.length > 0) {
        setSelectedCatId(cats[0].id)
      }
    } catch (err) {
      showToast('Failed to load categories', 'error')
    } finally {
      setIsLoadingCats(false)
    }
  }, [tenant?.id])

  const loadItems = useCallback(async (catId: string) => {
    if (!tenant?.id) return
    setIsLoadingItems(true)
    try {
      const data = await api<MenuItem[]>(`/api/ordering/menu/items?tenantId=${tenant.id}&categoryId=${catId}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast('Failed to load items', 'error')
    } finally {
      setIsLoadingItems(false)
    }
  }, [tenant?.id])

  useEffect(() => {
    if (tenant?.id) loadCategories(true)
  }, [tenant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCatId) loadItems(selectedCatId)
    else setItems([])
  }, [selectedCatId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Category CRUD ─────────────────────────────────────────────────────────

  async function handleAddCategory() {
    if (!catName.trim() || !tenant?.id) return
    setIsSavingCat(true)
    try {
      const created = await api<Category>('/api/ordering/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName.trim() }),
      })
      setCatName('')
      setShowAddCat(false)
      // Optimistically append — do NOT re-fetch (nginx cache may return stale empty array)
      setCategories((prev) => [...prev, created])
      setSelectedCatId(created.id)
      showToast('Category added', 'success')
    } catch (err) {
      showToast((err as Error).message.includes('403') ? 'Permission denied' : 'Failed to add category', 'error')
    } finally {
      setIsSavingCat(false)
    }
  }

  async function handleUpdateCategory() {
    if (!editCatId || !editCatName.trim()) return
    setIsUpdatingCat(true)
    try {
      await api(`/api/ordering/menu/categories/${editCatId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editCatName.trim() }),
      })
      setEditCatId(null)
      // Optimistic update
      setCategories((prev) => prev.map((c) => c.id === editCatId ? { ...c, name: editCatName.trim() } : c))
      showToast('Category updated', 'success')
    } catch (err) {
      showToast('Failed to update category', 'error')
    } finally {
      setIsUpdatingCat(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCatId(id)
    try {
      await api(`/api/ordering/menu/categories/${id}`, { method: 'DELETE' })
      // Optimistic update
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (selectedCatId === id) {
        setSelectedCatId(null)
        setItems([])
      }
      showToast('Category deleted', 'success')
    } catch (err) {
      showToast('Failed to delete category', 'error')
    } finally {
      setDeletingCatId(null)
    }
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────

  async function handleAddItem() {
    if (!itemName.trim() || !itemPrice || !selectedCatId || !tenant?.id) return
    const priceKobo = Math.round(parseFloat(itemPrice) * 100)
    if (isNaN(priceKobo) || priceKobo < 0) return
    setIsSavingItem(true)
    try {
      const created = await api<MenuItem>('/api/ordering/menu/items', {
        method: 'POST',
        body: JSON.stringify({
          name: itemName.trim(),
          description: itemDesc.trim() || undefined,
          price_kobo: priceKobo,
          category_id: selectedCatId,
        }),
      })
      setItemName('')
      setItemDesc('')
      setItemPrice('')
      setShowAddItem(false)
      // Optimistic update
      setItems((prev) => [...prev, created])
      showToast('Item added', 'success')
    } catch (err) {
      showToast('Failed to add item', 'error')
    } finally {
      setIsSavingItem(false)
    }
  }

  async function handleUpdateItem() {
    if (!editItemId || !editItemName.trim() || !editItemPrice) return
    const priceKobo = Math.round(parseFloat(editItemPrice) * 100)
    if (isNaN(priceKobo) || priceKobo < 0) return
    setIsUpdatingItem(true)
    try {
      const updated = await api<MenuItem>(`/api/ordering/menu/items/${editItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editItemName.trim(),
          description: editItemDesc.trim() || undefined,
          price_kobo: priceKobo,
        }),
      })
      // Use the actual saved record from the DB — never derive from local form state
      setItems((prev) => prev.map((i) => i.id === editItemId ? updated : i))
      setEditItemId(null)
      showToast('Item updated', 'success')
    } catch (err) {
      showToast('Failed to update item', 'error')
    } finally {
      setIsUpdatingItem(false)
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    setTogglingItemId(item.id)
    try {
      await api(`/api/ordering/menu/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !item.available }),
      })
      // Use DB response to ensure all fields (including description) are intact
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !item.available } : i))
      showToast(item.available ? 'Item hidden from customers' : 'Item made available', 'success')
    } catch (err) {
      showToast('Failed to update availability', 'error')
    } finally {
      setTogglingItemId(null)
    }
  }

  async function handleDeleteItem(id: string) {
    setDeletingItemId(id)
    try {
      await api(`/api/ordering/menu/items/${id}`, { method: 'DELETE' })
      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== id))
      showToast('Item deleted', 'success')
    } catch (err) {
      showToast('Failed to delete item', 'error')
    } finally {
      setDeletingItemId(null)
    }
  }

  function startEditItem(item: MenuItem) {
    setEditItemId(item.id)
    setEditItemName(item.name)
    setEditItemDesc(item.description ?? '')
    setEditItemPrice(String(item.price_kobo / 100))
    setShowAddItem(false)
  }

  const selectedCategory = categories.find((c) => c.id === selectedCatId)

  return (
    <div>
      {toast && (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200">
            <span className="text-lg">🛍️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your menu categories and items. Customers browse and order through WhatsApp.</p>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal category pills */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Categories</p>
          <button
            onClick={() => { setShowAddCat(true); setEditCatId(null) }}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            title="Add category"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Add category form — mobile */}
        {showAddCat && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 mb-3">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category name"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAddCategory}
                disabled={!catName.trim() || isSavingCat}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSavingCat && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSavingCat ? 'Adding…' : 'Add'}
              </button>
              <button
                onClick={() => { setShowAddCat(false); setCatName('') }}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {isLoadingCats
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-full bg-gray-200 animate-pulse shrink-0" />
              ))
            : categories.length === 0
            ? <p className="text-xs text-gray-400">No categories yet</p>
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedCatId === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))
          }
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Categories panel — desktop only */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Categories</p>
              <button
                onClick={() => { setShowAddCat(true); setEditCatId(null) }}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                title="Add category"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            {/* Add category form */}
            {showAddCat && (
              <div className="px-3 py-3 border-b border-indigo-100 bg-indigo-50">
                <input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Category name"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddCategory}
                    disabled={!catName.trim() || isSavingCat}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSavingCat && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isSavingCat ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowAddCat(false); setCatName('') }}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {isLoadingCats
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <Shimmer className="h-3.5 w-3/4" />
                    </div>
                  ))
                : categories.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-gray-400">No categories yet</p>
                  )
                : categories.map((cat) => (
                    <div key={cat.id}>
                      {editCatId === cat.id ? (
                        <div className="px-3 py-2 bg-indigo-50">
                          <input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            autoFocus
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1.5"
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={handleUpdateCategory}
                              disabled={!editCatName.trim() || isUpdatingCat}
                              className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-0.5 text-xs text-white disabled:opacity-50"
                            >
                              {isUpdatingCat && <span className="h-2.5 w-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditCatId(null)}
                              className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedCatId(cat.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs transition-colors group ${
                            selectedCatId === cat.id
                              ? 'bg-indigo-50 text-indigo-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditCatId(cat.id)
                                setEditCatName(cat.name)
                                setShowAddCat(false)
                              }}
                              className="rounded p-0.5 hover:bg-gray-200 text-gray-400 hover:text-gray-700"
                              title="Edit category"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCategory(cat.id)
                              }}
                              disabled={deletingCatId === cat.id}
                              className="rounded p-0.5 hover:bg-red-100 text-gray-400 hover:text-red-600 disabled:opacity-50"
                              title="Delete category"
                            >
                              {deletingCatId === cat.id
                                ? <span className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin inline-block" />
                                : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                )}
                            </button>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Items panel */}
        <div className="flex-1 min-w-0">
          {!selectedCatId ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-sm text-gray-400">
                {categories.length === 0 ? 'Create a category first' : 'Select a category to view its items'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedCategory?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isLoadingItems ? '…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddItem(true); setEditItemId(null) }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Item
                </button>
              </div>

              {/* Add item form */}
              {showAddItem && (
                <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50 space-y-3">
                  <p className="text-xs font-semibold text-indigo-900">New Item</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Jollof Rice"
                        autoFocus
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                    <input
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="Short description shown to customers"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddItem}
                      disabled={!itemName.trim() || !itemPrice || isSavingItem}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSavingItem && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      {isSavingItem ? 'Adding…' : 'Add Item'}
                    </button>
                    <button
                      onClick={() => { setShowAddItem(false); setItemName(''); setItemDesc(''); setItemPrice('') }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items list */}
              <div className="divide-y divide-gray-100">
                {isLoadingItems
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-4">
                        <div className="space-y-1.5 flex-1">
                          <Shimmer className="h-3.5 w-1/3" />
                          <Shimmer className="h-3 w-1/2" />
                        </div>
                        <Shimmer className="h-4 w-16" />
                      </div>
                    ))
                  : items.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm text-gray-400">No items in this category</p>
                        <button
                          onClick={() => setShowAddItem(true)}
                          className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Add first item
                        </button>
                      </div>
                    )
                  : items.map((item) => (
                      <div key={item.id}>
                        {editItemId === item.id ? (
                          <div className="px-5 py-4 bg-indigo-50 border-l-4 border-indigo-500 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input
                                  value={editItemName}
                                  onChange={(e) => setEditItemName(e.target.value)}
                                  autoFocus
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editItemPrice}
                                  onChange={(e) => setEditItemPrice(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                              <input
                                value={editItemDesc}
                                onChange={(e) => setEditItemDesc(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleUpdateItem}
                                disabled={!editItemName.trim() || !editItemPrice || isUpdatingItem}
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isUpdatingItem && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {isUpdatingItem ? 'Saving…' : 'Save Changes'}
                              </button>
                              <button
                                onClick={() => setEditItemId(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 sm:px-5 py-4">
                            <div className="flex items-start sm:items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {item.available ? 'Available' : 'Hidden'}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                )}
                                <p className="text-sm font-bold text-gray-900 mt-1 sm:hidden">{formatNaira(item.price_kobo)}</p>
                              </div>
                              <span className="hidden sm:block text-sm font-semibold text-gray-900 shrink-0">{formatNaira(item.price_kobo)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <button
                                onClick={() => handleToggleAvailability(item)}
                                disabled={togglingItemId === item.id}
                                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                                title={item.available ? 'Hide from customers' : 'Make available'}
                              >
                                {togglingItemId === item.id && (
                                  <span className="h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                )}
                                {item.available ? 'Hide' : 'Show'}
                              </button>
                              <button
                                onClick={() => startEditItem(item)}
                                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingItemId === item.id}
                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                              >
                                {deletingItemId === item.id && (
                                  <span className="h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                )}
                                {deletingItemId === item.id ? '…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
