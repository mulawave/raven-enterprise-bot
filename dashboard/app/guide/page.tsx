import Link from 'next/link'

export const metadata = { title: 'User Guide — Raven Business Automator (RBA)' }

const sections = [
  {
    id: 'getting-started',
    title: '1. Getting Started',
    content: [
      {
        heading: 'Receiving your Tenant ID',
        body: 'After your account is provisioned by a Raven Business Automator (RBA) administrator, you will receive an email containing your Tenant ID. This ID is unique to your business and is required to log in. Keep it secure.',
      },
      {
        heading: 'Logging in',
        body: 'Visit https://app.raven-ai.online and click "Sign In". Enter your Tenant ID on the login screen. No password is required at this stage — the Tenant ID itself is your credential. You will be redirected to your dashboard overview.',
      },
    ],
  },
  {
    id: 'dashboard-overview',
    title: '2. Dashboard Overview',
    content: [
      {
        heading: 'Overview page',
        body: 'The Overview page shows your current subscription plan, conversation usage for the month, total revenue from orders, and recent activity. A usage progress bar indicates how many of your plan\'s conversations you have consumed.',
      },
      {
        heading: 'Navigation',
        body: 'Use the left sidebar to navigate between modules: Conversations, Orders, Bookings, Payments, Subscription, and Settings. The sidebar also shows your business name and branding configured in Settings.',
      },
    ],
  },
  {
    id: 'conversations',
    title: '3. Conversations',
    content: [
      {
        heading: 'Viewing conversations',
        body: 'The Conversations page lists all WhatsApp threads your AI assistant has handled. Click any row to see the full message history, including messages sent by the AI and the customer\'s replies.',
      },
      {
        heading: 'AI responses',
        body: 'Your AI assistant responds automatically to customer messages using the context you have configured (products, FAQs, business hours). Responses are generated in real time and sent directly to the customer\'s WhatsApp.',
      },
      {
        heading: 'Conversation status',
        body: 'Each conversation has a status: Active (ongoing), Resolved (closed by AI), or Escalated (flagged for human follow-up). You can filter by status using the tabs at the top of the page.',
      },
    ],
  },
  {
    id: 'orders',
    title: '4. Orders',
    content: [
      {
        heading: 'How orders are created',
        body: 'When a customer selects products through a WhatsApp conversation, the AI creates an order automatically and sends a confirmation message. Orders appear in the Orders page in real time.',
      },
      {
        heading: 'Order statuses',
        body: 'Orders move through these stages: Pending → Confirmed → Processing → Completed. You can update status manually or configure automated transitions. Cancelled orders are archived.',
      },
      {
        heading: 'Revenue tracking',
        body: 'Completed orders contribute to your revenue figures on the Overview page. Amounts are displayed in your configured currency.',
      },
    ],
  },
  {
    id: 'products',
    title: '5. Products & Menu',
    content: [
      {
        heading: 'Adding products',
        body: 'Go to Settings → Products to add the items your AI will promote. Each product has a name, price, description, and optional image. The AI references these when customers ask what you offer.',
      },
      {
        heading: 'Categories',
        body: 'Group your products into categories (e.g., Starters, Mains, Beverages) to help the AI present them in an organised way during conversations.',
      },
    ],
  },
  {
    id: 'bookings',
    title: '6. Bookings & Appointments',
    content: [
      {
        heading: 'Enabling bookings',
        body: 'If your plan includes the Bookings module, customers can schedule appointments through WhatsApp. Configure available time slots, services, and lead times in Settings → Bookings.',
      },
      {
        heading: 'Automated reminders',
        body: 'Raven Business Automator (RBA) sends a WhatsApp reminder to the customer 24 hours before the appointment. Reminders are sent automatically — no manual action required.',
      },
    ],
  },
  {
    id: 'broadcasts',
    title: '7. Broadcast Campaigns',
    content: [
      {
        heading: 'Creating a broadcast',
        body: 'Navigate to Conversations → Broadcasts. Enter your message, select a customer segment (All Customers, Recent Buyers, Inactive Users), set a schedule, and click Send. Templates must comply with WhatsApp\'s policies.',
      },
      {
        heading: 'Delivery reporting',
        body: 'After a broadcast is sent, the Broadcasts page shows delivery rate, open rate (where available), and click-through if your message included a link.',
      },
    ],
  },
  {
    id: 'subscription',
    title: '8. Subscription & Billing',
    content: [
      {
        heading: 'Viewing your plan',
        body: 'Go to Subscription to see your current plan, monthly conversation limit, renewal date, and billing history. All invoices are emailed to your registered address and available for download.',
      },
      {
        heading: 'Upgrading or downgrading',
        body: 'Click "Change Plan" to view available tiers. Upgrades take effect immediately. Downgrades apply at the start of the next billing cycle.',
      },
      {
        heading: 'Payment',
        body: 'Payments are processed securely via Paystack. Cards are not stored on Raven Business Automator (RBA) servers. You will receive an invoice email after each successful charge.',
      },
    ],
  },
  {
    id: 'settings',
    title: '9. Settings',
    content: [
      {
        heading: 'Business profile',
        body: 'Set your business name, address, and contact email under Settings → Profile. This information appears in AI-generated messages and email footers.',
      },
      {
        heading: 'Branding',
        body: 'Upload a business logo and set your brand colour so the dashboard reflects your identity. These settings are visible only within your dashboard.',
      },
      {
        heading: 'Notifications',
        body: 'Configure which events trigger email notifications to your team — e.g., new orders, failed payments, or escalated conversations.',
      },
    ],
  },
  {
    id: 'help',
    title: '10. Getting Help',
    content: [
      {
        heading: 'Support',
        body: 'For platform issues, email support@raven-ai.online. Include your Tenant ID and a description of the problem. Response time is within one business day.',
      },
      {
        heading: 'WhatsApp Business API issues',
        body: 'If your AI stops responding to customers, first check your WhatsApp API key status in the admin credentials section. Expired or revoked keys will pause all outbound messages.',
      },
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-indigo-400 font-bold tracking-tight">Raven Business Automator (RBA)</Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">&larr; Back</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        {/* Table of contents */}
        <aside className="lg:w-56 shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Contents</p>
          <nav className="space-y-1">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="block text-sm text-slate-400 hover:text-white py-1 hover:pl-1 transition-all">
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Guide content */}
        <main className="flex-1 space-y-12">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tenant User Guide</h1>
            <p className="text-slate-400 text-sm">A step-by-step guide to getting the most out of the Raven Business Automator (RBA) platform.</p>
          </div>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-slate-700/40 pb-2">{section.title}</h2>
              {section.content.map((block) => (
                <div key={block.heading} className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
                  <h3 className="font-medium text-indigo-300 mb-1.5">{block.heading}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{block.body}</p>
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-6">
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400">Terms of Use</Link>
          <Link href="/" className="hover:text-slate-400">Home</Link>
        </div>
      </footer>
    </div>
  )
}
