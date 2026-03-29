import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Faq {
  id: string
  question: string
  answer: string
  sortOrder?: number
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Faqs'>
}

const PAGE_SIZE = 5

export function FaqsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await api<any>('/api/faqs')
      const raw = res?.data ?? res ?? []
      setFaqs(raw.map((f: any) => ({
        id: f.id,
        question: f.question || '',
        answer: f.answer || '',
        sortOrder: f.sort_order ?? f.sortOrder ?? 0,
      })))
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchFaqs() }, [fetchFaqs])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchFaqs()
    setRefreshing(false)
  }

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    setIsSaving(true)
    try {
      await api('/api/faqs', {
        method: 'POST',
        body: { question: newQuestion.trim(), answer: newAnswer.trim() },
      })
      setNewQuestion('')
      setNewAnswer('')
      setShowAdd(false)
      await fetchFaqs()
    } catch {
      Alert.alert('Error', 'Failed to add FAQ')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editQuestion.trim() || !editAnswer.trim()) return
    setIsUpdating(true)
    try {
      await api(`/api/faqs/${id}`, {
        method: 'PATCH',
        body: { question: editQuestion.trim(), answer: editAnswer.trim() },
      })
      setEditingId(null)
      await fetchFaqs()
    } catch {
      Alert.alert('Error', 'Failed to update FAQ')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete FAQ', 'Remove this FAQ?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          try {
            await api(`/api/faqs/${id}`, { method: 'DELETE' })
            await fetchFaqs()
          } catch {
            Alert.alert('Error', 'Failed to delete FAQ')
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  const totalPages = Math.ceil(faqs.length / PAGE_SIZE)
  const pagedFaqs = faqs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  function renderFaq({ item }: { item: Faq }) {
    const isEditing = editingId === item.id
    const isDeleting = deletingId === item.id

    if (isEditing) {
      return (
        <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.primary, padding: 16, marginHorizontal: 20, marginBottom: 10 }}>
          <TextInput
            value={editQuestion}
            onChangeText={setEditQuestion}
            placeholder="Question"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}
          />
          <TextInput
            value={editAnswer}
            onChangeText={setEditAnswer}
            placeholder="Answer"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border, minHeight: 60, marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              disabled={isUpdating || !editQuestion.trim() || !editAnswer.trim()}
              onPress={() => handleUpdate(item.id)}
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 10, alignItems: 'center', opacity: isUpdating || !editQuestion.trim() || !editAnswer.trim() ? 0.5 : 1 }}
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
      <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginHorizontal: 20, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#00CEC920', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#00CEC9' }}>Q</Text>
          </View>
          <Text style={{ flex: 1, fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>{item.question}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity
              onPress={() => { setEditingId(item.id); setEditQuestion(item.question); setEditAnswer(item.answer) }}
              style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="pencil" size={12} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isDeleting}
              onPress={() => handleDelete(item.id)}
              style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: `${colors.error}15`, alignItems: 'center', justifyContent: 'center', opacity: isDeleting ? 0.5 : 1 }}
            >
              <Ionicons name="trash-outline" size={12} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#00B89420', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#00B894' }}>A</Text>
          </View>
          <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>{item.answer}</Text>
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
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#00CEC920', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="help-circle" size={16} color="#00CEC9" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>FAQs</Text>
        </View>
        {!isLoading && faqs.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>{faqs.length}</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={{ padding: 4 }}>
          <Ionicons name={showAdd ? 'close' : 'add-circle'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={{ marginHorizontal: 20, marginTop: 12, backgroundColor: `${colors.info}12`, borderRadius: BorderRadius.sm, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={{ fontSize: FontSize.xs, color: colors.info, flex: 1 }}>FAQs power the AI bot's responses to customer questions</Text>
      </View>

      {/* Add form */}
      {showAdd && (
        <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16, gap: 8, marginTop: 8 }}>
          <TextInput
            value={newQuestion}
            onChangeText={setNewQuestion}
            placeholder="Question"
            placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border }}
          />
          <TextInput
            value={newAnswer}
            onChangeText={setNewAnswer}
            placeholder="Answer"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border, minHeight: 60 }}
          />
          <TouchableOpacity
            disabled={isSaving || !newQuestion.trim() || !newAnswer.trim()}
            onPress={handleAdd}
            style={{ backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 12, alignItems: 'center', opacity: isSaving || !newQuestion.trim() || !newAnswer.trim() ? 0.5 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.md }}>{isSaving ? 'Adding…' : 'Add FAQ'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
              <ShimmerRow width="70%" />
              <ShimmerRow width="90%" height={12} />
            </View>
          ))}
        </View>
      ) : faqs.length === 0 ? (
        <EmptyState
          icon="help-circle-outline"
          title="No FAQs yet"
          subtitle="Add frequently asked questions to train your AI bot"
        />
      ) : (
        <FlatList
          data={pagedFaqs}
          keyExtractor={(item) => item.id}
          renderItem={renderFaq}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          ListFooterComponent={renderPagination}
        />
      )}
    </KeyboardAvoidingView>
  )
}
