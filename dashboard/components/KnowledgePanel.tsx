"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

interface KnowledgeSource {
  id: string
  type: 'website' | 'text'
  label: string
  url: string | null
  status: 'queued' | 'crawling' | 'ready' | 'failed'
  pagesIndexed: number
  lastCrawledAt: string | null
  lastError: string | null
}

interface KnowledgePage {
  id: string
  url: string
  title: string | null
  status: string
  fetched_at: string | null
}

interface TestResult {
  answer: string | null
  wouldHandOff: boolean
  aiAvailable: boolean
  passages: { title: string | null; url: string | null; excerpt: string }[]
}

const STATUS_STYLE: Record<KnowledgeSource['status'], string> = {
  queued: 'bg-gray-100 text-gray-700',
  crawling: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<KnowledgeSource['status'], string> = {
  queued: 'Waiting',
  crawling: 'Reading site…',
  ready: 'Ready',
  failed: 'Failed',
}

export default function KnowledgePanel({
  assistantId,
  verifiedHosts,
  onToast,
}: {
  assistantId: string
  verifiedHosts: string[]
  onToast: (type: 'success' | 'error', text: string) => void
}) {
  const base = `/api/website-assistant/${assistantId}/knowledge`
  // Parent passes a fresh callback each render; keep it out of effect deps
  const toastRef = useRef(onToast)
  toastRef.current = onToast
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'website' | 'text'>('website')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [busySourceId, setBusySourceId] = useState<string | null>(null)
  const [openPagesFor, setOpenPagesFor] = useState<string | null>(null)
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [question, setQuestion] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const load = useCallback(async () => {
    try {
      setSources(await api<KnowledgeSource[]>(base))
    } catch (error) {
      toastRef.current('error', error instanceof Error ? error.message : 'Failed to load knowledge sources.')
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    setLoading(true)
    setTestResult(null)
    setOpenPagesFor(null)
    void load()
  }, [load])

  // Poll while anything is being indexed
  const indexing = sources.some((s) => s.status === 'queued' || s.status === 'crawling')
  useEffect(() => {
    if (!indexing) return
    const timer = setInterval(() => void load(), 10000)
    return () => clearInterval(timer)
  }, [indexing, load])

  async function addSource() {
    setAdding(true)
    try {
      const body = mode === 'website' ? { type: 'website', url } : { type: 'text', label, text }
      const created = await api<KnowledgeSource>(`${base}/sources`, { method: 'POST', body: JSON.stringify(body) })
      setSources((current) => [...current, created])
      setUrl('')
      setLabel('')
      setText('')
      onToast('success', mode === 'website' ? 'Website added. Reading it usually takes a few minutes.' : 'Text added to your assistant’s knowledge.')
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Failed to add knowledge source.')
    } finally {
      setAdding(false)
    }
  }

  async function refresh(source: KnowledgeSource) {
    setBusySourceId(source.id)
    try {
      const updated = await api<KnowledgeSource>(`${base}/sources/${source.id}/refresh`, { method: 'POST' })
      setSources((current) => current.map((s) => (s.id === source.id ? updated : s)))
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Failed to refresh source.')
    } finally {
      setBusySourceId(null)
    }
  }

  async function remove(source: KnowledgeSource) {
    if (!confirm(`Remove "${source.label}"? Your assistant will stop using this content.`)) return
    setBusySourceId(source.id)
    try {
      await api(`${base}/sources/${source.id}`, { method: 'DELETE' })
      setSources((current) => current.filter((s) => s.id !== source.id))
      if (openPagesFor === source.id) setOpenPagesFor(null)
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Failed to remove source.')
    } finally {
      setBusySourceId(null)
    }
  }

  async function togglePages(source: KnowledgeSource) {
    if (openPagesFor === source.id) {
      setOpenPagesFor(null)
      return
    }
    try {
      setPages(await api<KnowledgePage[]>(`${base}/sources/${source.id}/pages`))
      setOpenPagesFor(source.id)
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Failed to load pages.')
    }
  }

  async function runTest() {
    if (!question.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await api<TestResult>(`${base}/test`, { method: 'POST', body: JSON.stringify({ question }) }))
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Test failed.')
    } finally {
      setTesting(false)
    }
  }

  const canAdd = mode === 'website' ? url.trim().length > 0 : label.trim().length > 0 && text.trim().length >= 20

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Knowledge</p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900">What your assistant knows</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add your website or paste information like policies and price lists. Your assistant answers from this on your
          website and on WhatsApp, alongside your FAQs and catalogue.
        </p>
      </div>

      {/* Add source */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold">
          {(['website', 'text'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {m === 'website' ? 'Website' : 'Paste text'}
            </button>
          ))}
        </div>

        {mode === 'website' ? (
          verifiedHosts.length === 0 ? (
            <p className="text-sm text-amber-700">Verify a domain above first — only verified websites can be read.</p>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`https://${verifiedHosts[0]}`}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addSource}
                disabled={adding || !canAdd}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? 'Adding…' : 'Read website'}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Title, e.g. Delivery & returns policy"
              maxLength={120}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={100000}
              placeholder="Paste the information your assistant should know…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                onClick={addSource}
                disabled={adding || !canAdd}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? 'Adding…' : 'Add text'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ) : sources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-500">No knowledge added yet</p>
            <p className="mt-1 text-xs text-gray-400">Your assistant currently answers from FAQs and your catalogue only.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{source.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[source.status]}`}>
                      {STATUS_LABEL[source.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {source.type === 'website' ? source.url : 'Pasted text'}
                    {source.status === 'ready' && source.type === 'website' && ` • ${source.pagesIndexed} page${source.pagesIndexed === 1 ? '' : 's'}`}
                    {source.lastCrawledAt && ` • updated ${new Date(source.lastCrawledAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                  </p>
                  {source.status === 'failed' && source.lastError && (
                    <p className="mt-2 text-xs text-red-600">{source.lastError}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {source.type === 'website' && source.pagesIndexed > 0 && (
                    <button onClick={() => togglePages(source)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      {openPagesFor === source.id ? 'Hide pages' : 'Pages'}
                    </button>
                  )}
                  <button
                    onClick={() => refresh(source)}
                    disabled={busySourceId === source.id || source.status === 'queued' || source.status === 'crawling'}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => remove(source)}
                    disabled={busySourceId === source.id}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {openPagesFor === source.id && (
                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto border-t border-gray-100 pt-3">
                  {pages.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-xs">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-indigo-600 hover:underline">
                        {p.title || p.url}
                      </a>
                      <span className="shrink-0 text-gray-400">{p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Test */}
      <div className="mt-6 border-t border-gray-100 pt-6">
        <h3 className="text-sm font-semibold text-gray-900">Test your assistant</h3>
        <p className="mt-1 text-xs text-gray-500">Ask a question the way a customer would and see which content it uses.</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runTest() }}
            maxLength={500}
            placeholder="e.g. How much is delivery to Lekki?"
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={runTest}
            disabled={testing || !question.trim()}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {testing ? 'Thinking…' : 'Ask'}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">
              {testResult.aiAvailable ? testResult.answer : 'AI replies are not configured (no OpenAI key), so only the matched content is shown below.'}
            </div>
            {testResult.wouldHandOff && (
              <p className="text-xs text-amber-700">The assistant would also alert your team to follow up on this question.</p>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Content used</p>
              {testResult.passages.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500">Nothing matched in your website or pasted text — only FAQs and catalogue were used.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {testResult.passages.map((p, i) => (
                    <li key={i} className="rounded-xl border border-gray-200 px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-800">
                        {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{p.title || p.url}</a> : p.title || 'Pasted text'}
                      </p>
                      <p className="mt-1 line-clamp-3 text-gray-600">{p.excerpt}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
