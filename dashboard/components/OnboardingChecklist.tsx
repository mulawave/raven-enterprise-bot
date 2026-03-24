'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'

const CHECKLIST_KEY = 'onboarding_checklist'

interface ChecklistState {
  whatsappConnected: boolean
  catalogueAdded: boolean
  faqsConfigured: boolean
  firstMessageSent: boolean
  orderingSetup: boolean
}

const DEFAULT_STATE: ChecklistState = {
  whatsappConnected: false,
  catalogueAdded: false,
  faqsConfigured: false,
  firstMessageSent: false,
  orderingSetup: false,
}

const STEPS = [
  {
    key: 'whatsappConnected' as keyof ChecklistState,
    icon: '📱',
    title: 'Connect WhatsApp',
    desc: 'Enter your Meta API keys so the bot can receive and reply to messages.',
    action: '/settings',
    actionLabel: 'Go to Settings',
  },
  {
    key: 'catalogueAdded' as keyof ChecklistState,
    icon: '🍽️',
    title: 'Set up your catalogue',
    desc: 'Add at least one menu category and item so customers can browse and order.',
    action: '/catalogue',
    actionLabel: 'Add menu items',
  },
  {
    key: 'faqsConfigured' as keyof ChecklistState,
    icon: '❓',
    title: 'Configure FAQs',
    desc: 'Add common questions and answers your bot will use when customers ask policy questions.',
    action: '/settings',
    actionLabel: 'Configure FAQs',
  },
  {
    key: 'firstMessageSent' as keyof ChecklistState,
    icon: '✉️',
    title: 'Send your first message',
    desc: 'Send a WhatsApp message to your bot number and confirm it replies correctly.',
    action: '/conversations',
    actionLabel: 'View conversations',
  },
  {
    key: 'orderingSetup' as keyof ChecklistState,
    icon: '🛒',
    title: 'Test the ordering flow',
    desc: 'Send "What\'s on the menu?" via WhatsApp and complete a test order.',
    action: '/orders',
    actionLabel: 'View orders',
  },
]

export default function OnboardingChecklist() {
  const router = useRouter()
  const [checklist, setChecklist] = useState<ChecklistState>(DEFAULT_STATE)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Load state from localStorage + branding theme
  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = localStorage.getItem(CHECKLIST_KEY)
    if (raw) {
      try {
        setChecklist(JSON.parse(raw) as ChecklistState)
        return
      } catch { /* ignore */ }
    }

    // Try to infer state from API (non-blocking)
    const session = getSession()
    if (!session) return

    fetch(`${API_BASE_URL}/api/tenant/onboarding-status`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: ChecklistState | null) => {
        if (data) {
          setChecklist(data)
          localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data))
        }
      })
      .catch(() => { /* non-critical */ })
  }, [])

  const markDone = useCallback((key: keyof ChecklistState) => {
    setChecklist(prev => {
      const next = { ...prev, [key]: true }
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
      }
      return next
    })
  }, [])

  const completedCount = Object.values(checklist).filter(Boolean).length
  const allDone = completedCount === STEPS.length

  // Don't render once all done and user has dismissed
  if (dismissed) return null

  // After all complete, show a compact success badge briefly
  if (allDone) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div>
            <div className="text-sm font-semibold text-emerald-300">Setup complete!</div>
            <div className="text-xs text-slate-400">You've completed all onboarding steps.</div>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-slate-300 text-xs">Dismiss</button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">🎓</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Beginners Guide</div>
            <div className="text-xs text-slate-400">{completedCount} of {STEPS.length} steps complete</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="16" cy="16" r="13" fill="none"
              stroke="#10b981" strokeWidth="3"
              strokeDasharray={`${(completedCount / STEPS.length) * 81.7} 81.7`}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-slate-500 text-xs">{collapsed ? '▲' : '▼'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-white/5">
          {STEPS.map(step => {
            const done = checklist[step.key]
            return (
              <div key={step.key} className={`flex items-start gap-3 px-4 py-3 transition ${done ? 'opacity-60' : ''}`}>
                {/* Checkbox */}
                <button
                  onClick={() => markDone(step.key)}
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-white/20 bg-transparent hover:border-emerald-500/60'
                  }`}
                  title={done ? 'Completed' : 'Mark as done'}
                >
                  {done && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{step.icon}</span>
                    <span className={`text-sm font-medium ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                      {step.title}
                    </span>
                  </div>
                  {!done && (
                    <>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                      <button
                        onClick={() => { markDone(step.key); router.push(step.action) }}
                        className="mt-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
                      >
                        {step.actionLabel} →
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
