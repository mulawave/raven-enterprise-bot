import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation as useRootNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Contact {
  id: string
  name: string
  phone: string
  notes?: string
  createdAt: string
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Contacts'>
}

const PAGE_SIZE = 7

export function ContactsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const rootNav = useRootNavigation() as any

  const fetchContacts = useCallback(async () => {
    try {
      const [res, convRes] = await Promise.all([
        api<any>('/api/contacts'),
        api<any>('/api/messaging/conversations').catch(() => []),
      ])
      const raw = res?.data ?? res ?? []
      setContacts(raw.map((c: any) => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        notes: c.notes || '',
        createdAt: c.created_at || c.createdAt || '',
      })))
      const rawConvs = convRes?.data ?? convRes ?? []
      setConversations(rawConvs)
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchContacts()
    setRefreshing(false)
  }

  async function handleAdd() {
    if (!newName.trim() || !newPhone.trim()) return
    setIsSaving(true)
    try {
      await api('/api/contacts', {
        method: 'POST',
        body: { name: newName.trim(), phone: newPhone.trim(), notes: newNotes.trim() || undefined },
      })
      setNewName('')
      setNewPhone('')
      setNewNotes('')
      setShowAdd(false)
      await fetchContacts()
    } catch {
      Alert.alert('Error', 'Failed to save contact')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setIsUpdating(true)
    try {
      await api(`/api/contacts/${id}`, {
        method: 'PATCH',
        body: { name: editName.trim(), notes: editNotes.trim() || undefined },
      })
      setEditingId(null)
      await fetchContacts()
    } catch {
      Alert.alert('Error', 'Failed to update contact')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert('Delete Contact', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          try {
            await api(`/api/contacts/${id}`, { method: 'DELETE' })
            await fetchContacts()
          } catch {
            Alert.alert('Error', 'Failed to delete contact')
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  function openChat(contact: Contact) {
    const conv = conversations.find((c: any) => c.customerPhone === contact.phone)
    if (conv) {
      rootNav.navigate('Chats', {
        screen: 'Chat',
        params: { conversationId: conv.id, name: contact.name, customerPhone: contact.phone },
      })
    } else {
      Alert.alert('No conversation', 'No WhatsApp conversation found for this contact')
    }
  }

  const totalPages = Math.ceil(contacts.length / PAGE_SIZE)
  const pagedContacts = contacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function renderPagination() {
    if (totalPages <= 1) return null
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 }}>
        <TouchableOpacity
          disabled={page === 0}
          onPress={() => setPage(p => p - 1)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: page === 0 ? colors.surfaceElevated : colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={18} color={page === 0 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>{page + 1} / {totalPages}</Text>
        <TouchableOpacity
          disabled={page >= totalPages - 1}
          onPress={() => setPage(p => p + 1)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: page >= totalPages - 1 ? colors.surfaceElevated : colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
      </View>
    )
  }

  function renderContact({ item }: { item: Contact }) {
    const isEditing = editingId === item.id
    const isDeleting = deletingId === item.id
    const initial = item.name ? item.name[0].toUpperCase() : '?'

    if (isEditing) {
      return (
        <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.primary, padding: 16, marginHorizontal: 20, marginBottom: 10 }}>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
          />
          <TextInput
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border, marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              disabled={isUpdating || !editName.trim()}
              onPress={() => handleUpdate(item.id)}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 10, alignItems: 'center', opacity: isUpdating || !editName.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.sm }}>{isUpdating ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditingId(null)}
              style={{ flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: BorderRadius.sm, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    return (
      <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#6C5CE720', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#6C5CE7' }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{item.phone}</Text>
          {item.notes ? <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{item.notes}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={() => openChat(item)}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#00B89415', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chatbubble-ellipses" size={14} color="#00B894" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setEditingId(item.id); setEditName(item.name); setEditNotes(item.notes || '') }}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="pencil" size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={isDeleting}
            onPress={() => handleDelete(item.id, item.name)}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.error}15`, alignItems: 'center', justifyContent: 'center', opacity: isDeleting ? 0.5 : 1 }}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#6C5CE720', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="book" size={16} color="#6C5CE7" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Contacts</Text>
        </View>
        {!isLoading && contacts.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>{contacts.length}</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={{ padding: 4 }}>
          <Ionicons name={showAdd ? 'close' : 'add-circle'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Add form */}
      {showAdd && (
        <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16, gap: 8 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Contact name"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border }}
          />
          <TextInput
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border }}
          />
          <TextInput
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border }}
          />
          <TouchableOpacity
            disabled={isSaving || !newName.trim() || !newPhone.trim()}
            onPress={handleAdd}
            style={{ backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 12, alignItems: 'center', opacity: isSaving || !newName.trim() || !newPhone.trim() ? 0.5 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.md }}>{isSaving ? 'Saving…' : 'Add Contact'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <ShimmerRow width={44} height={44} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerRow width="60%" />
                <ShimmerRow width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="No saved contacts"
          subtitle="Save contacts from conversations or add them here"
        />
      ) : (
        <FlatList
          data={pagedContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          ListFooterComponent={renderPagination}
        />
      )}
    </KeyboardAvoidingView>
  )
}
