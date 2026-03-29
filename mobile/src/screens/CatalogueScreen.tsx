import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, ScrollView, RefreshControl, TouchableOpacity,
  Modal, TextInput, Alert, Switch, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Category {
  id: string
  name: string
}

interface MenuItem {
  id: string
  name: string
  price_kobo: number
  description?: string | null
  available?: boolean
  category_id: string
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Catalogue'>
}

export function CatalogueScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { session } = useAuth()
  const insets = useSafeAreaInsets()

  const [categories, setCategories] = useState<Category[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const initialLoad = useRef(true)

  // Category CRUD state
  const [catModalVisible, setCatModalVisible] = useState(false)
  const [catEditId, setCatEditId] = useState<string | null>(null)
  const [catNameInput, setCatNameInput] = useState('')
  const [isSavingCat, setIsSavingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  // Item CRUD state
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [itemEditId, setItemEditId] = useState<string | null>(null)
  const [itemNameInput, setItemNameInput] = useState('')
  const [itemPriceInput, setItemPriceInput] = useState('')
  const [itemDescInput, setItemDescInput] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState<string>('')
  const [itemAvailable, setItemAvailable] = useState(true)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const tenantId = session?.user?.tenant_id || session?.tenant?.id || ''

  const fetchCatalogue = useCallback(async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        api<any>(`/api/ordering/menu/categories?tenantId=${tenantId}`),
        api<any>(`/api/ordering/menu/items?tenantId=${tenantId}`),
      ])
      const cats: Category[] = (catsRes?.data ?? catsRes ?? []).map((c: any) => ({ id: c.id, name: c.name }))
      const items: MenuItem[] = (itemsRes?.data ?? itemsRes ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        price_kobo: i.price_kobo ?? 0,
        description: i.description || null,
        available: i.available !== false,
        category_id: i.category_id,
      }))
      setCategories(cats)
      setAllItems(items)
      if (initialLoad.current && cats.length > 0) {
        setSelectedCat(cats[0].id)
        initialLoad.current = false
      }
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchCatalogue()
  }, [fetchCatalogue])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchCatalogue()
    setRefreshing(false)
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  // ── Category CRUD ──────────────────────────────

  function openAddCategory() {
    setCatEditId(null)
    setCatNameInput('')
    setCatModalVisible(true)
  }

  function openEditCategory(cat: Category) {
    setCatEditId(cat.id)
    setCatNameInput(cat.name)
    setCatModalVisible(true)
  }

  function showCategoryActions(cat: Category) {
    const itemCount = allItems.filter(i => i.category_id === cat.id).length
    Alert.alert(cat.name, `${itemCount} item${itemCount !== 1 ? 's' : ''}`, [
      { text: 'Edit', onPress: () => openEditCategory(cat) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteCategory(cat) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function confirmDeleteCategory(cat: Category) {
    const itemCount = allItems.filter(i => i.category_id === cat.id).length
    if (itemCount > 0) {
      Alert.alert('Cannot Delete', `"${cat.name}" has ${itemCount} item${itemCount !== 1 ? 's' : ''}. Remove all items first.`)
      return
    }
    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteCategory(cat.id) },
    ])
  }

  async function handleSaveCategory() {
    const name = catNameInput.trim()
    if (!name) return
    setIsSavingCat(true)
    try {
      if (catEditId) {
        await api(`/api/ordering/menu/categories/${catEditId}`, {
          method: 'PATCH',
          body: { name },
        })
      } else {
        const res = await api<any>(`/api/ordering/menu/categories`, {
          method: 'POST',
          body: { name, tenantId },
        })
        const newId = res?.id || res?.data?.id
        if (newId) setTimeout(() => setSelectedCat(newId), 200)
      }
      setCatModalVisible(false)
      await fetchCatalogue()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save category')
    } finally {
      setIsSavingCat(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCatId(id)
    try {
      await api(`/api/ordering/menu/categories/${id}`, { method: 'DELETE' })
      if (selectedCat === id) {
        const remaining = categories.filter(c => c.id !== id)
        setSelectedCat(remaining[0]?.id || null)
      }
      await fetchCatalogue()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete category')
    } finally {
      setDeletingCatId(null)
    }
  }

  // ── Item CRUD ──────────────────────────────

  function openAddItem() {
    setItemEditId(null)
    setItemNameInput('')
    setItemPriceInput('')
    setItemDescInput('')
    setItemCategoryId(selectedCat || categories[0]?.id || '')
    setItemAvailable(true)
    setItemModalVisible(true)
  }

  function openEditItem(item: MenuItem) {
    setItemEditId(item.id)
    setItemNameInput(item.name)
    setItemPriceInput((item.price_kobo / 100).toString())
    setItemDescInput(item.description || '')
    setItemCategoryId(item.category_id)
    setItemAvailable(item.available !== false)
    setItemModalVisible(true)
  }

  function confirmDeleteItem(item: MenuItem) {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteItem(item.id) },
    ])
  }

  async function handleSaveItem() {
    const name = itemNameInput.trim()
    const priceStr = itemPriceInput.trim()
    if (!name || !priceStr || !itemCategoryId) {
      Alert.alert('Error', 'Fill in all required fields')
      return
    }
    const price = parseFloat(priceStr)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid price')
      return
    }
    setIsSavingItem(true)
    try {
      const body: Record<string, any> = {
        name,
        price_kobo: Math.round(price * 100),
        category_id: itemCategoryId,
        available: itemAvailable,
      }
      if (itemDescInput.trim()) body.description = itemDescInput.trim()
      if (itemEditId) {
        await api(`/api/ordering/menu/items/${itemEditId}`, {
          method: 'PATCH',
          body,
        })
      } else {
        body.tenantId = tenantId
        await api(`/api/ordering/menu/items`, {
          method: 'POST',
          body,
        })
      }
      setItemModalVisible(false)
      await fetchCatalogue()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save item')
    } finally {
      setIsSavingItem(false)
    }
  }

  async function handleDeleteItem(id: string) {
    setDeletingItemId(id)
    try {
      await api(`/api/ordering/menu/items/${id}`, { method: 'DELETE' })
      await fetchCatalogue()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete item')
    } finally {
      setDeletingItemId(null)
    }
  }

  // ── Rendering ──────────────────────────────

  const filteredItems = selectedCat ? allItems.filter(i => i.category_id === selectedCat) : allItems

  function renderItem({ item }: { item: MenuItem }) {
    const isDeleting = deletingItemId === item.id
    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginBottom: 10,
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>{item.name}</Text>
            {item.description && (
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!item.available && (
              <View
                style={{
                  backgroundColor: `${colors.error}15`,
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.error }}>
                  Unavailable
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={() => openEditItem(item)} style={{ padding: 6 }}>
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDeleteItem(item)} disabled={isDeleting} style={{ padding: 6 }}>
              {isDeleting
                ? <ActivityIndicator size="small" color={colors.error} />
                : <Ionicons name="trash" size={16} color={colors.error} />
              }
            </TouchableOpacity>
          </View>
        </View>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary, marginTop: 10 }}>
          {formatKobo(item.price_kobo)}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.header,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#00B89420', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid" size={16} color="#00B894" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Catalogue</Text>
        </View>
        {!isLoading && allItems.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>
              {allItems.length} item{allItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {/* Category pills shimmer */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerRow key={i} width={80} height={36} />
            ))}
          </View>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 }}>
              <ShimmerRow width="60%" />
              <ShimmerRow width="80%" height={12} />
              <ShimmerRow width="30%" />
            </View>
          ))}
        </View>
      ) : categories.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Ionicons name="grid-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.text, marginBottom: 6 }}>No catalogue yet</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
            Start by adding your first category
          </Text>
          <TouchableOpacity
            onPress={openAddCategory}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.md,
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: '#fff' }}>Add Category</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Category pills — tap to select, long-press to edit/delete */}
          <View style={{ height: 56, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center', height: 56, gap: 8 }}
            >
              {categories.map((cat) => {
                const isActive = selectedCat === cat.id
                const count = allItems.filter(i => i.category_id === cat.id).length
                const isDeleting = deletingCatId === cat.id
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCat(cat.id)}
                    onLongPress={() => showCategoryActions(cat)}
                    disabled={isDeleting}
                    style={{
                      height: 36,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={isActive ? '#fff' : colors.primary} />
                    ) : (
                      <>
                        <Text
                          style={{
                            fontSize: FontSize.sm,
                            fontWeight: '600',
                            color: isActive ? '#fff' : colors.textSecondary,
                            lineHeight: 18,
                          }}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        <View style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${colors.primary}15`,
                          borderRadius: 8,
                          paddingHorizontal: 5,
                          height: 18,
                          minWidth: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#fff' : colors.primary, lineHeight: 14 }}>
                            {count}
                          </Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                )
              })}
              {/* Add category "+" pill */}
              <TouchableOpacity
                onPress={openAddCategory}
                style={{
                  height: 36, width: 36, borderRadius: 10,
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Add Item button */}
          <TouchableOpacity
            onPress={openAddItem}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              marginHorizontal: 20, marginTop: 12, marginBottom: 4, alignSelf: 'flex-start',
              backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30`,
              borderStyle: 'dashed', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
            }}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.primary }}>Add Item</Text>
          </TouchableOpacity>

          {/* Items */}
          <FlatList
            data={filteredItems}
            style={{ marginTop: 8 }}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <EmptyState
                icon="fast-food-outline"
                title="No items"
                subtitle="Tap 'Add Item' to create a menu item in this category"
              />
            }
          />
        </View>
      )}

      {/* ── Category Modal ── */}
      <Modal visible={catModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
                padding: 24, paddingBottom: insets.bottom + 24,
              }}
            >
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
                {catEditId ? 'Edit Category' : 'Add Category'}
              </Text>

              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                Category Name
              </Text>
              <TextInput
                value={catNameInput}
                onChangeText={setCatNameInput}
                placeholder="e.g. Drinks, Burgers, Desserts"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={{
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                  borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: FontSize.md, color: colors.text, marginBottom: 24,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setCatModalVisible(false)}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
                    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveCategory}
                  disabled={isSavingCat || !catNameInput.trim()}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
                    backgroundColor: !catNameInput.trim() ? `${colors.primary}40` : colors.primary,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isSavingCat && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: '#fff' }}>
                    {isSavingCat ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Item Modal ── */}
      <Modal visible={itemModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{
                maxHeight: '85%',
                backgroundColor: colors.card,
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
              }}
              contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
                {itemEditId ? 'Edit Item' : 'Add Item'}
              </Text>

              {/* Category picker */}
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {categories.map(cat => {
                  const active = itemCategoryId === cat.id
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setItemCategoryId(cat.id)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Name */}
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Item Name</Text>
              <TextInput
                value={itemNameInput}
                onChangeText={setItemNameInput}
                placeholder="e.g. Chicken Burger"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                  borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: FontSize.md, color: colors.text, marginBottom: 16,
                }}
              />

              {/* Price */}
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Price (₦)</Text>
              <TextInput
                value={itemPriceInput}
                onChangeText={setItemPriceInput}
                placeholder="e.g. 2500"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                  borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: FontSize.md, color: colors.text, marginBottom: 16,
                }}
              />

              {/* Description */}
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Description (optional)</Text>
              <TextInput
                value={itemDescInput}
                onChangeText={setItemDescInput}
                placeholder="Short description"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                  borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: FontSize.md, color: colors.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
                }}
              />

              {/* Available toggle */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>Available</Text>
                <Switch
                  value={itemAvailable}
                  onValueChange={setItemAvailable}
                  trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                  thumbColor={itemAvailable ? colors.primary : colors.textSecondary}
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setItemModalVisible(false)}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
                    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveItem}
                  disabled={isSavingItem || !itemNameInput.trim() || !itemPriceInput.trim() || !itemCategoryId}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
                    backgroundColor: (!itemNameInput.trim() || !itemPriceInput.trim()) ? `${colors.primary}40` : colors.primary,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isSavingItem && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: '#fff' }}>
                    {isSavingItem ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  )
}
