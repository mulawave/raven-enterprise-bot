'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const TOUR_SEEN_KEY = 'dashboard_tour_seen'

const TOUR_STEPS = [
  {
    target: 'nav-overview',
    title: 'Overview',
    body: 'Your command centre. See total conversations, revenue, active customers and a live chat feed at a glance.',
    position: 'right' as const,
  },
  {
    target: 'nav-conversations',
    title: 'Conversations',
    body: 'Every WhatsApp (or Instagram/Facebook) chat your AI bot handles. You can read, reply, and escalate from here.',
    position: 'right' as const,
  },
  {
    target: 'nav-orders',
    title: 'Orders',
    body: 'Orders placed by customers through WhatsApp. Update status from pending → confirmed → ready → delivered.',
    position: 'right' as const,
  },
  {
    target: 'nav-menu',
    title: 'Menu / Catalogue',
    body: 'Add your products, services or menu items. The bot uses this to answer "What do you have?" and take orders.',
    position: 'right' as const,
  },
  {
    target: 'nav-customers',
    title: 'Customers',
    body: 'Everyone who has messaged you. View history, contact details, and conversation threads.',
    position: 'right' as const,
  },
  {
    target: 'nav-broadcast',
    title: 'Broadcast',
    body: 'Send a message to all your customers at once — promotions, updates, announcements.',
    position: 'right' as const,
  },
  {
    target: 'nav-analytics',
    title: 'Analytics',
    body: 'Conversation volume, response times, popular intents, peak hours. Understand how customers engage.',
    position: 'right' as const,
  },
  {
    target: 'nav-settings',
    title: 'Settings',
    body: 'Update your business name, brand colour, logo, and connected WhatsApp number.',
    position: 'right' as const,
  },
]

export default function DashboardTour({ onDismiss }: { onDismiss: () => void }) {
  const [stepIdx, setStepIdx] = useState(0)
  const step = TOUR_STEPS[stepIdx]
  const isLast = stepIdx === TOUR_STEPS.length - 1

  function handleDone() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_SEEN_KEY, '1')
    }
    onDismiss()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleDone}
      />

      {/* Tour card — anchored to left side */}
      <div className="fixed left-[280px] top-1/2 -translate-y-1/2 z-50 w-80 rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? 'bg-emerald-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          {stepIdx + 1} of {TOUR_STEPS.length}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{step.body}</p>

        <div className="flex gap-2">
          {stepIdx > 0 && (
            <button
              onClick={() => setStepIdx(i => i - 1)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              ← Back
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStepIdx(i => i + 1)}
              className="flex-[2] rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleDone}
              className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-sm font-semibold text-white"
            >
              Let's go! 🚀
            </button>
          )}
        </div>

        <button
          onClick={handleDone}
          className="w-full mt-3 text-center text-xs text-slate-600 hover:text-slate-400"
        >
          Skip tour
        </button>
      </div>
    </>
  )
}

/** Hook — returns true if the tour should be shown */
export function useShouldShowTour(): boolean {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(TOUR_SEEN_KEY)
    // Show tour on first visit to /overview after login
    if (!seen && pathname === '/overview') {
      setShow(true)
    }
  }, [pathname])

  return show
}

export { TOUR_SEEN_KEY }
