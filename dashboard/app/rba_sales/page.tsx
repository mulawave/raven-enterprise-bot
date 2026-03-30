'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   Raven Enterprise Platform — Product Sales Page
   Route: /rba_sales  (standalone, no auth required)
   ═══════════════════════════════════════════════════════════════════════════ */

const LEMONSQUEEZY_URL = 'https://mulawave.lemonsqueezy.com/buy/raven-enterprise'
const PRICE = 149
const EXTENDED_PRICE = 499

const INCLUDED_CARD_TONES = [
  {
    iconBoxClassName: 'bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20',
    badgeClassName: 'bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20',
  },
  {
    iconBoxClassName: 'bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20',
    badgeClassName: 'bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20',
  },
  {
    iconBoxClassName: 'bg-emerald-500/14 text-emerald-300 ring-emerald-400/20',
    badgeClassName: 'bg-emerald-500/14 text-emerald-300 ring-emerald-400/20',
  },
  {
    iconBoxClassName: 'bg-sky-500/14 text-sky-300 ring-sky-400/20',
    badgeClassName: 'bg-sky-500/14 text-sky-300 ring-sky-400/20',
  },
] as const

const FEATURE_CARD_TONES = [
  'bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20',
  'bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20',
  'bg-emerald-500/14 text-emerald-300 ring-emerald-400/20',
  'bg-sky-500/14 text-sky-300 ring-sky-400/20',
] as const

const PERSONA_CARD_TONES = [
  'bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20',
  'bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20',
  'bg-emerald-500/14 text-emerald-300 ring-emerald-400/20',
  'bg-sky-500/14 text-sky-300 ring-sky-400/20',
] as const

const STEP_CARD_TONES = [
  'bg-[#173a6c]/45 border-[#8fd8ff]/20 text-[#8fd8ff]',
  'bg-[#2b1a09]/70 border-[#f5c16c]/20 text-[#f5c16c]',
  'bg-emerald-950/60 border-emerald-400/20 text-emerald-300',
  'bg-sky-950/60 border-sky-400/20 text-sky-300',
] as const

const FEATURE_ICONS = {
  sparkles: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3ZM5 16.5 6 19l2.5 1-2.5 1L5 23l-1-2.5-2.5-1L4 19l1-2.5Zm14-1.5 1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15Z" />
    </svg>
  ),
  handoff: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h5.5a3.75 3.75 0 0 1 0 7.5h-1.5M15.75 16.5h-5.5a3.75 3.75 0 0 1 0-7.5h1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m13.5 6 2.25 1.5L13.5 9M10.5 15l-2.25 1.5L10.5 18" />
    </svg>
  ),
  cart: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.084.837L5.64 7.5m0 0h12.874c.766 0 1.41.574 1.497 1.335l.53 4.666a1.5 1.5 0 0 1-1.49 1.665H8.25a1.5 1.5 0 0 1-1.474-1.22L5.64 7.5Zm2.61 11.25a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Zm10.5 0a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z" />
    </svg>
  ),
  card: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <rect x="3" y="5.25" width="18" height="13.5" rx="2.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75h18M7.5 15h3" />
    </svg>
  ),
  bell: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 18.75a2.25 2.25 0 0 1-4.5 0M5.25 15.75h13.5c-1.056-1.02-1.5-2.54-1.5-4.5V9a5.25 5.25 0 1 0-10.5 0v2.25c0 1.96-.444 3.48-1.5 4.5Z" />
    </svg>
  ),
  buildings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 20.25h16.5M5.25 20.25V6.75A1.5 1.5 0 0 1 6.75 5.25h3A1.5 1.5 0 0 1 11.25 6.75v13.5m1.5 0V3.75A1.5 1.5 0 0 1 14.25 2.25h3A1.5 1.5 0 0 1 18.75 3.75v16.5M7.5 9h1.5m-1.5 3h1.5m6-3h1.5m-1.5 3h1.5" />
    </svg>
  ),
  shield: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.166 1.248 4.558 1.86 6.75 1.86v5.268c0 4.277-2.957 8.021-6.75 8.972-3.793-.95-6.75-4.695-6.75-8.972V4.86C7.442 4.86 9.834 4.248 12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 12 1.5 1.5 3-3" />
    </svg>
  ),
  theme: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-9-9v18a9 9 0 0 0 9-9Z" />
    </svg>
  ),
  megaphone: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12.75v-1.5A2.25 2.25 0 0 1 6 9h2.25l8.25-3.75v13.5L8.25 15H6a2.25 2.25 0 0 1-2.25-2.25Zm3.75 3.75L9 21" />
    </svg>
  ),
  calendar: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75v3M17.25 3.75v3M4.5 8.25h15M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v11.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  ),
  chart: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5M7.5 16.5v-6m4.5 6v-9m4.5 9V12" />
    </svg>
  ),
  lock: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.875a4.5 4.5 0 1 0-9 0V10.5M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V12A1.5 1.5 0 0 1 6 10.5Z" />
    </svg>
  ),
  rocket: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9V5.625A2.625 2.625 0 0 0 12.375 3H9.75l-4.5 4.5V10.5L3 12.75l2.25 2.25H7.5l4.5 4.5h2.625A2.625 2.625 0 0 0 17.25 16.875V13.5l3.75-3.75L17.25 6 15 8.25Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h.008v.008H9.75V9.75Z" />
    </svg>
  ),
  briefcase: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V6A2.25 2.25 0 0 1 11.25 3.75h1.5A2.25 2.25 0 0 1 15 6v.75m-9.75 1.5h13.5A1.5 1.5 0 0 1 20.25 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
    </svg>
  ),
  code: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 9-3 3 3 3m7.5-6 3 3-3 3M13.5 6l-3 12" />
    </svg>
  ),
} as const

const PERSONA_ICONS = {
  rocket: FEATURE_ICONS.rocket,
  briefcase: FEATURE_ICONS.briefcase,
  code: FEATURE_ICONS.code,
  shield: FEATURE_ICONS.shield,
} as const

/* ── Data ──────────────────────────────────────────────────────────────── */

const INCLUDED = [
  {
    title: 'Backend API',
    tech: 'NestJS · Prisma · PostgreSQL · Redis',
    features: ['REST + WebSocket API', '35+ database models', 'Background job queues (BullMQ)', 'WhatsApp Cloud API integration', 'AI chatbot engine (OpenAI GPT)'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-13.5 0a3 3 0 0 1-3-3m3 3h13.5m0 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 0 0 6m3-9a3 3 0 0 0-3-3m3 3H9m12 0a3 3 0 0 0-3-3" /></svg>
    ),
    screenshot: '/sales/web-conversations.png',
    screenshotAlt: 'Backend API — conversation engine',
  },
  {
    title: 'Tenant Dashboard',
    tech: 'Next.js 14 · Tailwind CSS',
    features: ['Live chat with customers', 'Order & payment management', 'AI bot configuration', 'Product catalogue editor', 'Analytics & usage metrics'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>
    ),
    screenshot: '/sales/web-dashboard.png',
    screenshotAlt: 'Tenant dashboard — overview',
  },
  {
    title: 'Admin Console',
    tech: 'Next.js 14 · Tailwind CSS',
    features: ['Tenant management & KYC', 'Subscription plan assignment', 'System configuration', 'Audit logs & compliance', 'Platform-wide analytics'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
    ),
    screenshot: '/sales/web-admin.png',
    screenshotAlt: 'Admin console — tenant management',
  },
  {
    title: 'Mobile App',
    tech: 'Expo SDK 55 · React Native',
    features: ['Push notifications & badges', 'Conversation management', 'Order tracking on the go', 'Onboarding wizard', 'Works on 2G/3G networks'],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
    ),
    screenshot: '/sales/mobile-chat.png',
    screenshotAlt: 'Mobile app — conversations',
  },
]

const FEATURES = [
  { iconKey: 'sparkles', title: 'AI Chatbot (GPT)', desc: 'Per-tenant system prompts, configurable tone, auto-FAQ learning from conversations.' },
  { iconKey: 'handoff', title: 'Smart Handoff', desc: 'Bot detects when it can\'t answer and routes to a human agent with full context summary.' },
  { iconKey: 'cart', title: 'Order Management', desc: 'Catalogue, cart, checkout, payment links, status tracking — all inside WhatsApp.' },
  { iconKey: 'card', title: 'Payments', desc: 'Paystack + Flutterwave integration with automated PDF receipts and audit trail.' },
  { iconKey: 'bell', title: 'Push Notifications', desc: 'Firebase Cloud Messaging for web dashboard and mobile app — real-time alerts.' },
  { iconKey: 'buildings', title: 'Multi-Tenant', desc: 'Complete data isolation, per-tenant billing, plan limits, white-label branding.' },
  { iconKey: 'shield', title: 'KYC & Compliance', desc: 'Built-in KYC verification workflow, GDPR consent tracking, data deletion requests.' },
  { iconKey: 'theme', title: 'Dark & Light Theme', desc: 'Professional UI across all frontends — CSS custom properties, class-based toggle.' },
  { iconKey: 'megaphone', title: 'Broadcast', desc: 'Send targeted promotions to customer segments with delivery tracking.' },
  { iconKey: 'calendar', title: 'Bookings', desc: 'Room/service reservations through WhatsApp with availability management.' },
  { iconKey: 'chart', title: 'Analytics', desc: 'Conversation volume, popular products, revenue trends, customer retention.' },
  { iconKey: 'lock', title: 'Role-Based Access', desc: 'SUPER_ADMIN, admin, owner, staff roles across every endpoint and UI.' },
] as const

const TECH_STACK = [
  { name: 'NestJS', color: 'text-red-400 bg-red-500/10 ring-red-500/20' },
  { name: 'Prisma', color: 'text-indigo-400 bg-indigo-500/10 ring-indigo-500/20' },
  { name: 'PostgreSQL', color: 'text-blue-400 bg-blue-500/10 ring-blue-500/20' },
  { name: 'Redis', color: 'text-red-400 bg-red-500/10 ring-red-500/20' },
  { name: 'Next.js 14', color: 'text-white bg-white/10 ring-white/20' },
  { name: 'Tailwind CSS', color: 'text-cyan-400 bg-cyan-500/10 ring-cyan-500/20' },
  { name: 'Expo / React Native', color: 'text-violet-400 bg-violet-500/10 ring-violet-500/20' },
  { name: 'PM2', color: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20' },
  { name: 'Firebase FCM', color: 'text-amber-400 bg-amber-500/10 ring-amber-500/20' },
  { name: 'Sentry', color: 'text-pink-400 bg-pink-500/10 ring-pink-500/20' },
  { name: 'OpenAI GPT', color: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20' },
  { name: 'Paystack', color: 'text-sky-400 bg-sky-500/10 ring-sky-500/20' },
  { name: 'Flutterwave', color: 'text-orange-400 bg-orange-500/10 ring-orange-500/20' },
  { name: 'TypeScript', color: 'text-blue-400 bg-blue-500/10 ring-blue-500/20' },
]

const STEPS = [
  { step: '01', title: 'Purchase', desc: 'Get instant access to the full source code, documentation, and deploy scripts.' },
  { step: '02', title: 'Configure', desc: 'Copy env.example, add your API keys — every key has a step-by-step guide.' },
  { step: '03', title: 'Deploy', desc: 'Run one PowerShell command. The script builds, uploads, migrates, and starts everything.' },
  { step: '04', title: 'Go Live', desc: 'Your platform is live. Onboard tenants, collect subscriptions, let AI handle the rest.' },
]

const PERSONAS = [
  { iconKey: 'rocket', title: 'SaaS Entrepreneurs', desc: 'Launch your own WhatsApp automation platform. Multi-tenant architecture, subscription billing, and plan limits — deploy once, onboard unlimited businesses.' },
  { iconKey: 'briefcase', title: 'Digital Agencies', desc: 'Serve all your SMB clients from one instance. Each tenant gets isolated data, their own branding, and a private dashboard.' },
  { iconKey: 'code', title: 'Freelance Developers', desc: 'Hired to build a WhatsApp business tool? Save 6–12 months. Customize and extend production-ready code instead of starting from scratch.' },
  { iconKey: 'shield', title: 'Self-Hosting Businesses', desc: 'Own your data. No per-seat SaaS fees. Buy once, deploy on your server, control everything.' },
] as const

const COMPARISON = [
  { feature: 'Multi-tenant SaaS architecture', raven: true, scratch: false },
  { feature: 'AI chatbot with GPT', raven: true, scratch: false },
  { feature: 'Live agent handoff with context', raven: true, scratch: false },
  { feature: 'WhatsApp Cloud API integration', raven: true, scratch: false },
  { feature: 'Order management & checkout', raven: true, scratch: false },
  { feature: 'Payment processing (Paystack + Flutterwave)', raven: true, scratch: false },
  { feature: 'Push notifications (web + mobile)', raven: true, scratch: false },
  { feature: 'Admin console with KYC workflow', raven: true, scratch: false },
  { feature: 'Mobile app (Play Store ready)', raven: true, scratch: false },
  { feature: 'Dark/light theme system', raven: true, scratch: false },
  { feature: 'Production deploy script', raven: true, scratch: false },
  { feature: '35+ database models with migrations', raven: true, scratch: false },
  { feature: 'GDPR compliance tools', raven: true, scratch: false },
  { feature: '10 documentation guides', raven: true, scratch: false },
  { feature: 'Time to production', ravenText: '1 day', scratchText: '6–12 months' },
]

const LICENSE_COMPARISON = [
  { feature: 'Deployment rights', regular: 'Single end product', extended: 'Unlimited products' },
  { feature: 'Domain limit', regular: '1 domain', extended: 'Multiple (admin-approved)' },
  { feature: 'Tenant limit', regular: 'Unlimited tenants', extended: 'Unlimited tenants' },
  { feature: 'End users can pay you', regular: false, extended: true },
  { feature: 'SaaS redistribution', regular: false, extended: true },
  { feature: 'White-label branding', regular: true, extended: true },
  { feature: 'Source code access', regular: true, extended: true },
  { feature: 'Mobile app included', regular: true, extended: true },
  { feature: 'Deploy script included', regular: true, extended: true },
  { feature: 'Documentation & guides', regular: true, extended: true },
  { feature: 'AI chatbot engine', regular: true, extended: true },
  { feature: 'Custom domain support', regular: true, extended: true },
  { feature: 'Subscription billing for tenants', regular: false, extended: true },
  { feature: 'Multi-domain activation', regular: false, extended: true },
  { feature: 'Priority domain approval', regular: false, extended: true },
  { feature: 'Commercial SaaS use', regular: false, extended: true },
  { feature: 'Activation type', regular: 'Instant (1 domain)', extended: 'Per-domain approval' },
  { feature: 'Price', regularText: `$${PRICE}`, extendedText: `$${EXTENDED_PRICE}` },
] as const

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What exactly do I get after purchase?',
    a: 'The complete source code for all 4 applications (backend API, tenant dashboard, admin console, mobile app), the full database schema with migrations, production deployment scripts, seed data, and 10 comprehensive documentation guides. Everything you need to deploy and run the platform.',
  },
  {
    q: 'What server do I need?',
    a: 'A VPS with at least 2 vCPU, 2 GB RAM, and 10 GB SSD running Ubuntu. Any provider works — DigitalOcean, Hetzner, Vultr, AWS, or cPanel/WHM. You also need PostgreSQL 14+, Redis 6+, and Node.js 20. Full specs in the deployment guide.',
  },
  {
    q: 'Do I need a WhatsApp Business API account?',
    a: 'Yes. The platform connects to WhatsApp via the official Meta Cloud API. You\'ll need a Meta Business account and a WhatsApp Business API phone number. The API keys guide walks you through every step of the setup.',
  },
  {
    q: 'Can I customize the branding and colors?',
    a: 'Yes. The theme system uses CSS custom properties and Tailwind utility classes. Change the primary color palette in globals.css, swap the logo, update business names in the environment config. A full theming guide is included.',
  },
  {
    q: 'Can I use this to build a SaaS and charge my own customers?',
    a: 'Yes — that\'s the primary use case. With the Extended license, you can run the platform as a paid SaaS service. The multi-tenant architecture, subscription billing, and plan limits are built in. Onboard tenants from day one.',
  },
  {
    q: 'Is there support included?',
    a: 'You get access to documentation, deployment guides, and the 10-file README directory that covers everything from API keys to Play Store submission. For direct support, reach out via email — details are included after purchase.',
  },
  {
    q: 'Can I publish the mobile app to Google Play Store?',
    a: 'Yes. The mobile app is an Expo React Native project ready for Android. The documentation includes a complete build guide, signing instructions, and a cheatsheet with pre-filled answers for every Play Store form question.',
  },
  {
    q: 'What\'s the difference between Regular and Extended license?',
    a: 'Regular license ($149): Deploy on one domain for a single end product that end users don\'t pay for. Extended license ($499): Deploy on multiple domains, charge subscriptions, and run Raven as a paid SaaS platform. See the full license comparison table above for a detailed breakdown.',
  },
]

/* ── Accordion component ─────────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-700/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between py-5 text-left text-sm font-semibold text-white transition-colors hover:text-[#f5c16c]"
      >
        {q}
        <svg className={`h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:text-[#f5c16c] ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <p className="pb-5 text-sm text-slate-400 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

/* ── Screenshot helper — graceful fallback when image is missing ────── */

function Screenshot({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [hasError, setHasError] = useState(false)
  const isMobilePreview = src.includes('/mobile-')
  const fallbackAspectClassName = isMobilePreview ? 'aspect-[10/19]' : 'aspect-[16/10]'

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-slate-800/50 ${className}`}>
      {hasError ? (
        <div className={`flex w-full ${fallbackAspectClassName} flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(30,77,140,0.32),rgba(8,16,29,0.96))] p-6 text-center`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${isMobilePreview ? 'bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20' : 'bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20'}`}>
            {isMobilePreview ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25A2.25 2.25 0 0 1 6 3h12a2.25 2.25 0 0 1 2.25 2.25v8.25A2.25 2.25 0 0 1 18 15.75H6a2.25 2.25 0 0 1-2.25-2.25V5.25ZM8.25 21h7.5" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{alt}</p>
            <p className="mt-1 text-xs text-slate-400">Preview unavailable in this environment.</p>
          </div>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-auto w-full object-cover"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        </>
      )}
    </div>
  )
}

function ActionCard({
  href,
  title,
  description,
  badgeLabel,
  icon,
  iconBoxClassName,
  badgeClassName,
  isExternal = false,
  openInNewTab = false,
}: {
  href: string
  title: string
  description: string
  badgeLabel: string
  icon: JSX.Element
  iconBoxClassName: string
  badgeClassName: string
  isExternal?: boolean
  openInNewTab?: boolean
}) {
  const cardClassName = 'group flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]'

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconBoxClassName}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition-transform group-hover:translate-x-0.5 ${badgeClassName}`}>
        {badgeLabel}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </>
  )

  if (isExternal) {
    return (
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className={cardClassName}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SalesPage() {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#08101d] text-white antialiased">

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 1 — NAV
      ──────────────────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#08101d]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173a6c]/55 text-[#f5c16c] ring-1 ring-white/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 7.5V16.5L12 21l7.5-4.5V7.5L12 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5 12 12.75l3.75-2.25" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8fd8ff]/80">Raven Enterprise</p>
              <p className="text-sm font-semibold text-white">WhatsApp Automation Source</p>
            </div>
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10">4 apps included</span>
            <span className="rounded-full bg-[#f49617]/12 px-3 py-1.5 text-[11px] font-medium text-[#f5c16c] ring-1 ring-[#f5c16c]/20">Deploy script included</span>
          </div>
        </div>
      </nav>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 2 — HERO
      ──────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-36 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[#173a6c]/32 blur-3xl" />
          <div className="absolute -left-20 top-44 h-[320px] w-[320px] rounded-full bg-[#f49617]/10 blur-3xl" />
          <div className="absolute right-[-110px] top-24 h-[360px] w-[360px] rounded-full bg-[#1e4d8c]/16 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8fd8ff]/20 bg-[#173a6c]/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8fd8ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f5c16c] animate-pulse" />
            Complete SaaS Source Code · Production Ready
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Launch Your Own{' '}
            <span className="bg-gradient-to-r from-[#f5c16c] via-white to-[#8fd8ff] bg-clip-text text-transparent">
              WhatsApp Automation
            </span>{' '}
            Platform
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-300/90">
            Multi-tenant SaaS backend, tenant dashboard, admin console, and mobile app — 
            35+ database models, AI chatbot, payments, push notifications, and a one-command deploy script.
            Ship in days, not months.
          </p>

          <div className="mx-auto grid max-w-3xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-[#f5c16c]/18 bg-white/[0.04] p-5 shadow-[0_24px_80px_-50px_rgba(244,150,23,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5c16c]/80">Regular License</p>
                  <p className="mt-3 text-4xl font-black text-white">${PRICE}</p>
                </div>
                <span className="rounded-full bg-[#f49617]/12 px-3 py-1 text-[11px] font-medium text-[#f5c16c] ring-1 ring-[#f5c16c]/20">One-time purchase</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">Use Raven for a single product or a private deployment your end users do not pay for.</p>
            </div>

            <div className="rounded-[1.75rem] border border-[#8fd8ff]/18 bg-[#173a6c]/24 p-5 shadow-[0_24px_80px_-55px_rgba(30,77,140,0.6)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8fd8ff]/85">Extended License</p>
                  <p className="mt-3 text-4xl font-black text-white">${EXTENDED_PRICE}</p>
                </div>
                <span className="rounded-full bg-[#1e4d8c]/24 px-3 py-1 text-[11px] font-medium text-[#8fd8ff] ring-1 ring-[#8fd8ff]/20">For paid SaaS usage</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300/85">Run Raven as a revenue product, charge subscriptions, and onboard paying tenants from day one.</p>
            </div>
          </div>

          <div className="mx-auto grid max-w-3xl gap-3 pt-2 sm:grid-cols-2">
            <ActionCard
              href={LEMONSQUEEZY_URL}
              title="Buy the full source bundle"
              description="Get the backend, dashboard, admin console, mobile app, deploy scripts, and guides in one purchase."
              badgeLabel={`Purchase for $${PRICE}`}
              iconBoxClassName="bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20"
              badgeClassName="bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20"
              isExternal
              openInNewTab
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm0 12 1.2 2.8L16 19l-2.8 1.2L12 23l-1.2-2.8L8 19l2.8-1.2L12 15Z" />
                </svg>
              }
            />
            <ActionCard
              href="/"
              title="Back to the platform"
              description="Return to the main Raven experience and explore the broader product surface."
              badgeLabel="Open platform"
              iconBoxClassName="bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20"
              badgeClassName="bg-[#173a6c]/40 text-[#8fd8ff] ring-[#8fd8ff]/20"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75v9.75h13.5V9.75" />
                </svg>
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs text-slate-300">
            {[
              '35+ Database Models',
              '4 Apps Included',
              '1-Command Deploy',
              'Play Store Ready',
              'Dark & Light Theme',
              'Full Source Code',
            ].map((highlight) => (
              <div key={highlight} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero screenshots — mobile mockups */}
        <div className="relative max-w-5xl mx-auto mt-16 flex items-end justify-center gap-4">
          <div className="hidden sm:block w-48 -rotate-6 opacity-80">
            <Screenshot src="/sales/mobile-dashboard.png" alt="Mobile dashboard" className="shadow-2xl shadow-black/40" />
          </div>
          <div className="w-56 sm:w-64 z-10">
            <Screenshot src="/sales/mobile-chat.png" alt="Mobile conversations" className="shadow-2xl shadow-black/50 ring-1 ring-white/10" />
          </div>
          <div className="hidden sm:block w-48 rotate-6 opacity-80">
            <Screenshot src="/sales/mobile-orders.png" alt="Mobile orders" className="shadow-2xl shadow-black/40" />
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 3 — WHAT'S INCLUDED
      ──────────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-transparent to-[#0d1422] px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">What&apos;s Included</h2>
          <p className="text-center text-slate-400 text-sm mb-14 max-w-xl mx-auto">
            Four complete applications — backend, two frontend dashboards, and a mobile app. 
            Full source code, database schema, and deploy scripts.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            {INCLUDED.map((includedItem, index) => {
              const tone = INCLUDED_CARD_TONES[index % INCLUDED_CARD_TONES.length]

              return (
              <div key={includedItem.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.iconBoxClassName}`}>
                    {includedItem.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white">{includedItem.title}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tone.badgeClassName}`}>
                        {includedItem.features.length} capabilities
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{includedItem.tech}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {includedItem.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Screenshot src={includedItem.screenshot} alt={includedItem.screenshotAlt} className="mt-5 shadow-[0_24px_80px_-55px_rgba(2,6,23,0.8)]" />
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 4 — FEATURES
      ──────────────────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">Feature Deep Dive</h2>
          <p className="text-center text-slate-400 text-sm mb-14">Every feature works end-to-end. No stubs, no placeholders.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, index) => {
              const featureTone = FEATURE_CARD_TONES[index % FEATURE_CARD_TONES.length]

              return (
                <div key={feature.title} className="rounded-[1.75rem] border border-slate-700/40 bg-slate-800/40 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600/60 hover:bg-slate-800/70">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${featureTone}`}>
                    {FEATURE_ICONS[feature.iconKey]}
                  </div>
                  <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 5 — SCREENSHOT GALLERY
      ──────────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-transparent to-[#0d1422] px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">See It in Action</h2>
          <p className="text-center text-slate-400 text-sm mb-14">Real screenshots from the production platform.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { src: '/sales/web-dashboard.png', alt: 'Tenant dashboard' },
              { src: '/sales/web-conversations.png', alt: 'Live conversations' },
              { src: '/sales/web-admin.png', alt: 'Admin console' },
              { src: '/sales/mobile-chat.png', alt: 'Mobile chat' },
              { src: '/sales/mobile-orders.png', alt: 'Mobile orders' },
              { src: '/sales/mobile-dashboard.png', alt: 'Mobile overview' },
              { src: '/sales/mobile-notifications.png', alt: 'Push notifications' },
              { src: '/sales/mobile-catalogue.png', alt: 'Product catalogue' },
            ].map((image) => (
              <Screenshot key={image.src} src={image.src} alt={image.alt} className="transition-all hover:ring-1 hover:ring-[#8fd8ff]/30" />
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 6 — TECH STACK
      ──────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built With Modern Tech</h2>
          <p className="text-slate-400 text-sm mb-12">Production-grade stack. No prototype code.</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH_STACK.map((techItem) => (
              <span key={techItem.name} className={`inline-flex items-center rounded-lg px-3.5 py-1.5 text-xs font-medium ring-1 ${techItem.color}`}>
                {techItem.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 7 — HOW IT WORKS
      ──────────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-transparent to-[#0d1422] px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-14">From Purchase to Production</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, index) => (
              <div key={step.step} className="relative">
                {index < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-6 hidden h-px w-full bg-gradient-to-r from-white/20 to-transparent lg:block" />
                )}
                <div className="relative space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold ${STEP_CARD_TONES[index % STEP_CARD_TONES.length]}`}>
                    {step.step}
                  </div>
                  <h4 className="font-semibold text-white">{step.title}</h4>
                  <p className="text-xs leading-relaxed text-slate-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 8 — WHO IS THIS FOR
      ──────────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">Who Is This For?</h2>
          <p className="text-center text-slate-400 text-sm mb-14">Built for builders — not end-users.</p>

          <div className="grid sm:grid-cols-2 gap-5">
            {PERSONAS.map((persona, index) => {
              const personaTone = PERSONA_CARD_TONES[index % PERSONA_CARD_TONES.length]

              return (
                <div key={persona.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${personaTone}`}>
                    {PERSONA_ICONS[persona.iconKey]}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{persona.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{persona.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 9 — COMPARISON TABLE
      ──────────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-transparent to-[#0d1422] px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">Raven vs Building From Scratch</h2>
          <p className="text-center text-slate-400 text-sm mb-14">Why start from zero when you can start from production?</p>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-3 bg-[#132545]/70 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <span>Feature</span>
              <span className="text-center">Raven</span>
              <span className="text-center">From Scratch</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-t border-white/5`}>
                <span className="text-slate-300">{row.feature}</span>
                <span className="text-center">
                  {'ravenText' in row ? (
                    <span className="text-emerald-400 font-semibold">{row.ravenText}</span>
                  ) : (
                    row.raven ? (
                      <svg className="mx-auto h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="mx-auto h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    )
                  )}
                </span>
                <span className="text-center">
                  {'scratchText' in row ? (
                    <span className="text-red-400 font-semibold">{row.scratchText}</span>
                  ) : (
                    row.scratch ? (
                      <svg className="mx-auto h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="mx-auto h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    )
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 9B — LICENSE COMPARISON
      ──────────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">Regular vs Extended License</h2>
          <p className="text-center text-slate-400 text-sm mb-14 max-w-xl mx-auto">
            Choose the license that fits your use case. Both include the full source code, all four apps, and deploy scripts.
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-3 bg-[#132545]/70 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <span>Feature</span>
              <span className="text-center">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f5c16c]"></span>
                  Regular — ${PRICE}
                </span>
              </span>
              <span className="text-center">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8fd8ff]"></span>
                  Extended — ${EXTENDED_PRICE}
                </span>
              </span>
            </div>
            {LICENSE_COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 px-5 py-3 text-sm ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-t border-white/5`}>
                <span className="text-slate-300">{row.feature}</span>
                <span className="text-center">
                  {'regularText' in row ? (
                    <span className="text-[#f5c16c] font-semibold">{row.regularText}</span>
                  ) : typeof row.regular === 'string' ? (
                    <span className="text-slate-300 text-xs">{row.regular}</span>
                  ) : row.regular ? (
                    <svg className="mx-auto h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  ) : (
                    <svg className="mx-auto h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  )}
                </span>
                <span className="text-center">
                  {'extendedText' in row ? (
                    <span className="text-[#8fd8ff] font-semibold">{row.extendedText}</span>
                  ) : typeof row.extended === 'string' ? (
                    <span className="text-slate-300 text-xs">{row.extended}</span>
                  ) : row.extended ? (
                    <svg className="mx-auto h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  ) : (
                    <svg className="mx-auto h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={LEMONSQUEEZY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 rounded-2xl border border-[#f5c16c]/20 bg-[#f49617]/10 px-6 py-4 text-sm font-semibold text-[#f5c16c] transition-all hover:-translate-y-0.5 hover:bg-[#f49617]/18"
            >
              Regular License — ${PRICE}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a
              href={LEMONSQUEEZY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 rounded-2xl border border-[#8fd8ff]/20 bg-[#173a6c]/24 px-6 py-4 text-sm font-semibold text-[#8fd8ff] transition-all hover:-translate-y-0.5 hover:bg-[#173a6c]/40"
            >
              Extended License — ${EXTENDED_PRICE}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 10 — FAQ
      ──────────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl sm:text-4xl font-bold mb-14">Frequently Asked Questions</h2>
          <div>
            {FAQS.map((faqItem) => (
              <FaqItem key={faqItem.q} q={faqItem.q} a={faqItem.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 11 — FINAL CTA
      ──────────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(30,77,140,0.26),rgba(8,16,29,0.96))] p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-10 h-60 w-60 rounded-full bg-[#f49617]/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1e4d8c]/24 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c16c]/20 bg-[#f49617]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5c16c]">
                Purchase once. Launch fast.
              </div>

              <div>
                <h2 className="text-3xl font-bold sm:text-4xl">Ready to launch Raven under your own brand?</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300/85 lg:mx-0">
                  Stop rebuilding WhatsApp infrastructure from scratch. Buy the production-ready platform,
                  wire in your keys, deploy with one PowerShell command, and start onboarding customers.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionCard
                  href={LEMONSQUEEZY_URL}
                  title="Secure your copy"
                  description="Instant access to all four apps, migrations, docs, and deployment automation."
                  badgeLabel={`Buy now $${PRICE}`}
                  iconBoxClassName="bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20"
                  badgeClassName="bg-[#f49617]/14 text-[#f5c16c] ring-[#f5c16c]/20"
                  isExternal
                  openInNewTab
                  icon={FEATURE_ICONS.sparkles}
                />
                <ActionCard
                  href="mailto:info@raven-ai.online"
                  title="Talk licensing"
                  description="Use this if you need extended-license clarity or a direct pre-purchase response."
                  badgeLabel="Email sales"
                  iconBoxClassName="bg-[#1e4d8c]/18 text-[#8fd8ff] ring-[#8fd8ff]/20"
                  badgeClassName="bg-[#173a6c]/40 text-[#8fd8ff] ring-[#8fd8ff]/20"
                  isExternal
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 7.5v9a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 16.5v-9m19.5 0A2.25 2.25 0 0 0 19.5 5.25h-15A2.25 2.25 0 0 0 2.25 7.5m19.5 0-8.689 5.432a2.25 2.25 0 0 1-2.372 0L2.25 7.5" />
                    </svg>
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 lg:justify-start">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">4 applications included</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">35+ database models</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">Deploy script included</span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8fd8ff]/85">Inside your purchase</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {[
                  'Backend API with Prisma schema and migrations',
                  'Tenant dashboard and admin console',
                  'Expo mobile app with notifications',
                  'Deployment scripts, env templates, and docs',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-[#f5c16c]/20 bg-[#f49617]/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f5c16c]/85">Regular</p>
                  <p className="mt-2 text-3xl font-black text-white">${PRICE}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">Single end product or internal deployment.</p>
                </div>
                <div className="rounded-2xl border border-[#8fd8ff]/20 bg-[#173a6c]/24 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8fd8ff]/85">Extended</p>
                  <p className="mt-2 text-3xl font-black text-white">${EXTENDED_PRICE}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">Required if end users pay you to use the SaaS.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────
          SECTION 12 — FOOTER
      ──────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>&copy; {year} Raven Enterprise Platform. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            <a href="mailto:info@raven-ai.online" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
