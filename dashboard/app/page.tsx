'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const FEATURES = [
  {
    icon: '💬',
    title: 'WhatsApp AI Assistant',
    desc: 'Automate customer conversations 24/7 with a context-aware AI trained on your products and FAQs.',
  },
  {
    icon: '🛒',
    title: 'Order Management',
    desc: 'Accept and track orders directly through WhatsApp — no separate app or website needed.',
  },
  {
    icon: '📣',
    title: 'Broadcast Campaigns',
    desc: 'Send targeted promotions to customer segments and measure click-through in real time.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'Understand conversation volume, popular products, and customer retention at a glance.',
  },
  {
    icon: '💳',
    title: 'Integrated Billing',
    desc: 'Subscription plans that scale with your usage — upgrade or downgrade at any time.',
  },
  {
    icon: '🏨',
    title: 'Bookings & Appointments',
    desc: 'Let customers book services through WhatsApp — automated reminders included.',
  },
]

const STEPS = [
  { step: '01', title: 'Sign up', desc: 'Request access and receive your Tenant ID by email.' },
  { step: '02', title: 'Connect WhatsApp', desc: 'Link your WhatsApp Business number via the API key setup.' },
  { step: '03', title: 'Configure your AI', desc: 'Upload products, set tone, define business hours.' },
  { step: '04', title: 'Go live', desc: 'Your AI assistant starts handling customer chats immediately.' },
]

export default function LandingPage() {
  const [year, setYear] = useState(2024)
  useEffect(() => { setYear(new Date().getFullYear()) }, [])

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0f1a]/80 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-indigo-400">Raven</span> AI
          </span>
          <div className="flex items-center gap-4">
            <Link href="/guide" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">
              User Guide
            </Link>
            <Link href="/login"
              className="px-4 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-300 text-sm font-medium hover:bg-indigo-500/10 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-powered WhatsApp commerce
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Turn WhatsApp into your{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              most powerful sales channel
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Raven AI handles customer conversations, orders, bookings, and follow-ups — automatically, at scale.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/login"
              className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-900/40">
              Get started free
            </Link>
            <Link href="/guide"
              className="px-7 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white font-semibold text-sm transition-colors">
              Read the guide
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-[#0d1422]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-3">Everything your business needs</h2>
          <p className="text-center text-slate-400 text-sm mb-12">One platform. Zero missed messages.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 hover:bg-slate-800/70 hover:border-slate-600/60 transition-all">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-12">Up and running in minutes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-1/2 w-full h-px bg-slate-700" />
                )}
                <div className="relative text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-900/50 border border-indigo-700/40 flex items-center justify-center text-indigo-300 font-bold text-sm">
                    {s.step}
                  </div>
                  <h4 className="font-semibold text-white">{s.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center rounded-2xl border border-indigo-700/30 bg-indigo-900/20 p-10 space-y-5">
          <h2 className="text-2xl font-bold">Ready to automate your WhatsApp?</h2>
          <p className="text-slate-400 text-sm">Sign in with your Tenant ID to access the dashboard.</p>
          <Link href="/login"
            className="inline-block px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
            Go to dashboard &rarr;
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>&copy; {year} Raven AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
