import Link from 'next/link'

export const metadata = { title: 'Terms of Use — Raven Business Automator (RBA)' }

export default function TermsPage() {
  const updated = 'June 2025'
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-indigo-400 font-bold tracking-tight">Raven Business Automator (RBA)</Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">&larr; Back</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: {updated}</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Raven Business Automator (RBA) ("the platform"), you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, you must not use the platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
            <p>You must be at least 18 years old and have the legal authority to enter into a binding agreement on behalf of yourself or your business. Use of the platform is subject to activation by a Raven Business Automator (RBA) administrator who issues a Tenant ID.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Permitted Use</h2>
            <p>You are permitted to use the platform for lawful business purposes only. You must not use the platform to send spam, engage in fraudulent activity, violate WhatsApp's policies, or transmit unlawful content.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Subscriptions and Billing</h2>
            <p>Access to premium features requires an active subscription. Subscriptions are billed monthly in advance. Downgrading or cancelling a subscription takes effect at the end of the current billing period. No partial refunds are provided.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Conversation Limits</h2>
            <p>Each subscription tier includes a monthly conversation limit. Conversations are measured as unique WhatsApp threads initiated or responded to within a calendar month. Exceeding a limit will suspend AI responses until the next billing cycle or an upgrade is applied.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Intellectual Property</h2>
            <p>All platform software, documentation, and branding are the intellectual property of Raven Business Automator (RBA). Content you upload (product data, templates, brand assets) remains your property. You grant Raven Business Automator (RBA) a limited licence to process this content to operate the platform services.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Availability and Support</h2>
            <p>We aim for 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be announced at least 24 hours in advance. Support is provided via the platform's registered contact email.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Raven Business Automator (RBA)'s liability for any claim arising out of your use of the platform is limited to the total fees paid by you in the three months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account if these terms are violated. You may close your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Governing Law</h2>
            <p>These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos State.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Changes to Terms</h2>
            <p>We may modify these terms at any time. Continued use of the platform after changes constitutes acceptance. We will notify active tenants by email of material changes at least 7 days before they take effect.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Contact</h2>
            <p>Legal enquiries: <a href="mailto:legal@raven-ai.online" className="text-indigo-400 hover:underline">legal@raven-ai.online</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-6">
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          <Link href="/guide" className="hover:text-slate-400">User Guide</Link>
          <Link href="/" className="hover:text-slate-400">Home</Link>
        </div>
      </footer>
    </div>
  )
}
