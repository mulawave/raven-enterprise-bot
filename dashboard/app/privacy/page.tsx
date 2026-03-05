import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Raven AI' }

export default function PrivacyPage() {
  const updated = 'June 2025'
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-indigo-400 font-bold tracking-tight">Raven AI</Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">&larr; Back</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-invert prose-slate">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: {updated}</p>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
          <p>When you use Raven AI, we collect information you provide directly — such as your business name, email address, and WhatsApp number — as well as technical data like IP addresses, browser type, and usage logs. Conversation data processed through the AI assistant is stored to improve response quality and provide analytics.</p>

          <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
          <p>We use the information we collect to operate and improve the platform, send transactional emails (e.g., invoices, subscription confirmations), provide customer support, and comply with legal obligations. We do not sell your personal data to third parties.</p>

          <h2 className="text-lg font-semibold text-white">3. Data Storage and Security</h2>
          <p>All data is stored on secure servers with encryption at rest and in transit. We implement industry-standard access controls and conduct regular security reviews. API keys and secrets are stored encrypted and never returned in full after initial entry.</p>

          <h2 className="text-lg font-semibold text-white">4. Third-Party Services</h2>
          <p>Raven AI integrates with third-party services including WhatsApp Business API (Meta), OpenAI, Paystack, and your configured SMTP provider. Each provider has its own privacy policy governing data shared with them during normal operation.</p>

          <h2 className="text-lg font-semibold text-white">5. Data Retention</h2>
          <p>Conversation logs are retained for 90 days by default. Invoice and subscription records are retained for 7 years to comply with financial regulations. You may request deletion of your account data at any time by contacting support.</p>

          <h2 className="text-lg font-semibold text-white">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You may also request a data export or object to processing in certain circumstances. To exercise these rights, contact us at privacy@raven-ai.online.</p>

          <h2 className="text-lg font-semibold text-white">7. Cookies</h2>
          <p>We use session cookies to maintain your authenticated state. No advertising or tracking cookies are used. You may disable cookies in your browser settings, though this will prevent you from using the authenticated dashboard.</p>

          <h2 className="text-lg font-semibold text-white">8. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the platform after changes constitutes acceptance.</p>

          <h2 className="text-lg font-semibold text-white">9. Contact</h2>
          <p>For privacy enquiries: <a href="mailto:privacy@raven-ai.online" className="text-indigo-400 hover:underline">privacy@raven-ai.online</a></p>
        </section>
      </main>
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-slate-400">Terms of Use</Link>
          <Link href="/guide" className="hover:text-slate-400">User Guide</Link>
          <Link href="/" className="hover:text-slate-400">Home</Link>
        </div>
      </footer>
    </div>
  )
}
