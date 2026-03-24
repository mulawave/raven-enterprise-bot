'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import Button from '@/components/Button'

type Stats = {
  tenants: number
  users: number
  customers: number
  conversations: number
  messages: number
  orders: number
  bookings: number
  payments: number
  branches: number
}

export default function PlatformResetPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [requireBackup, setRequireBackup] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  const [backupDone, setBackupDone] = useState(false)
  const [backupTimestamp, setBackupTimestamp] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)

  const [resetDone, setResetDone] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ tenantsAffected: number } | null>(null)

  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CONFIRM_PHRASE = 'RESET ALL TENANTS'

  // Gate: reset is enabled when backup is not required, OR backup has been downloaded
  const resetEnabled = !requireBackup || backupDone

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await api.get<{ require_backup_before_reset: boolean }>(API_ENDPOINTS.PLATFORM_RESET_CONFIG)
        setRequireBackup(data.require_backup_before_reset)
      } catch {
        // default to not required if config fetch fails
      } finally {
        setIsLoadingConfig(false)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingStats(true)
        const data = await api.get<Stats>(API_ENDPOINTS.PLATFORM_RESET_STATS)
        setStats(data)
      } catch {
        // non-fatal
      } finally {
        setIsLoadingStats(false)
      }
    }
    loadStats()
  }, [resetDone])

  async function handleDownloadBackup() {
    setBackupError(null)
    try {
      const data = await api.get<object>(API_ENDPOINTS.PLATFORM_RESET_BACKUP)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raven-platform-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setBackupTimestamp(new Date().toLocaleString())
      setBackupDone(true)
    } catch (err: any) {
      setBackupError(err.message || 'Failed to create backup')
    }
  }

  async function handleReset() {
    if (confirmText !== CONFIRM_PHRASE || !resetEnabled) return
    setIsResetting(true)
    setResetError(null)
    try {
      const result = await api.post<{ success: boolean; tenants_affected: number; message: string }>(
        API_ENDPOINTS.PLATFORM_RESET,
        {},
      )
      if (!result.success) {
        setResetError('Reset failed on server. Please try again.')
        return
      }
      setResetResult({ tenantsAffected: result.tenants_affected })
      setConfirmText('')
      setResetDone(true)
    } catch (err: any) {
      setResetError(err.message || 'Reset failed')
    } finally {
      setIsResetting(false)
    }
  }

  async function handleRestore() {
    if (!restoreFile) return
    setIsRestoring(true)
    setRestoreError(null)
    setRestoreSuccess(false)
    try {
      const text = await restoreFile.text()
      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch {
        setRestoreError('Invalid file. Must be a valid JSON backup downloaded from this page.')
        return
      }
      if (parsed?.type !== 'global' || !parsed?.data) {
        setRestoreError(
          parsed?.type === 'tenant'
            ? 'This is a per-tenant backup. Use the restore option on the individual tenant page instead.'
            : 'Invalid backup format. Only global platform backups are accepted here.',
        )
        return
      }
      const result = await api.post<{ success: boolean }>(API_ENDPOINTS.PLATFORM_RESTORE, parsed)
      if (!result.success) {
        setRestoreError('Restore failed on server. Please try again.')
        return
      }
      setRestoreSuccess(true)
      setRestoreFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setResetDone(false)
    } catch (err: any) {
      setRestoreError(err.message || 'Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }

  const statItems = [
    { label: 'Tenants', value: stats?.tenants, color: 'text-slate-800' },
    { label: 'Staff users', value: stats?.users, color: 'text-blue-700' },
    { label: 'Customers', value: stats?.customers, color: 'text-purple-600' },
    { label: 'Orders', value: stats?.orders, color: 'text-orange-600' },
    { label: 'Bookings', value: stats?.bookings, color: 'text-rose-600' },
    { label: 'Conversations', value: stats?.conversations, color: 'text-teal-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Reset</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Permanently deletes <strong>all tenants</strong> and every record they own across the entire platform.
          This is a complete, irreversible wipe.
          {requireBackup && !isLoadingConfig && (
            <span className="text-amber-600 font-medium"> Backup download is required before reset.</span>
          )}
        </p>
      </div>

      {/* â”€â”€ Top stat bar â”€â”€ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            {isLoadingStats ? (
              <div className="h-7 w-12 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
            ) : (
              <p className={`text-2xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>

      {/* â”€â”€ Main two-column grid â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* â”€â”€ LEFT: What the reset does â”€â”€ */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">What gets reset</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Permanently deleted â€” all tenants</p>
                <ul className="space-y-1.5">
                  {[
                    'All tenant accounts',
                    'All staff & owner accounts',
                    'All customer records',
                    'All orders & order items',
                    'All bookings',
                    'All conversations & messages',
                    'Menu categories & items',
                    'Room types',
                    'Branches & assignments',
                    'Payments & payment audits',
                    'Subscriptions & invoices',
                    'Usage & feature flags',
                    'KYC & bank accounts',
                    'Withdrawals',
                    'SLA logs & audit logs',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-red-800">
                      <span className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full bg-red-200 flex items-center justify-center">
                        <svg className="w-2 h-2 text-red-700" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M6 4.586L9.293 1.293a1 1 0 011.414 1.414L7.414 6l3.293 3.293a1 1 0 01-1.414 1.414L6 7.414l-3.293 3.293a1 1 0 01-1.414-1.414L4.586 6 1.293 2.707a1 1 0 011.414-1.414L6 4.586z" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Survives the reset</p>
                <ul className="space-y-1.5">
                  {[
                    'Admin user accounts (SYSTEM scope)',
                    'System configuration (API keys, SMTP)',
                    'Subscription plans & pricing',
                    'App branding & settings',
                    'Reseller accounts',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full bg-slate-300 flex items-center justify-center">
                        <svg className="w-2 h-2 text-slate-600" fill="currentColor" viewBox="0 0 12 12">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L5 8.586l5.293-5.293z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Restore from backup */}
          <div className="bg-white rounded-xl border border-amber-300 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-200 bg-amber-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <span>â†©</span> Restore from backup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a global backup file to undo a platform reset. Only accepts backups downloaded from this page.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {restoreSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Platform data restored successfully.
                </div>
              )}
              {restoreError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{restoreError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select backup file (.json)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    setRestoreFile(e.target.files?.[0] ?? null)
                    setRestoreError(null)
                    setRestoreSuccess(false)
                  }}
                  className="block text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-sm file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50"
                />
              </div>
              <Button
                onClick={handleRestore}
                disabled={!restoreFile}
                isLoading={isRestoring}
                loadingText="Restoringâ€¦"
                className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Restore from Backup
              </Button>
            </div>
          </div>
        </div>

        {/* â”€â”€ RIGHT: Backup + Execute reset â”€â”€ */}
        <div className="space-y-4">

          {/* Backup download â€” always visible, optional unless config requires it */}
          <div className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-colors ${backupDone ? 'border-green-400' : 'border-slate-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${backupDone ? 'bg-green-50 border-green-200' : 'border-slate-100'}`}>
              <div>
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  Download platform backup
                  {requireBackup && !backupDone && (
                    <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Required</span>
                  )}
                  {backupDone && (
                    <span className="text-xs font-normal text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">âœ“ Done</span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exports a complete snapshot of all tenants and their data â€” orders, customers, conversations, payments, and more.
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              {backupError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{backupError}</p>
              )}
              {backupTimestamp && (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Backup downloaded â€” {backupTimestamp}
                </div>
              )}
              <Button
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                isLoading={false}
                loadingText=""
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {backupTimestamp ? 'Re-download Backup' : 'Download Backup'}
              </Button>
            </div>
          </div>

          {/* Execute reset */}
          <div className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-colors ${
            resetDone ? 'border-green-400' : resetEnabled ? 'border-red-300' : 'border-slate-100 opacity-60 pointer-events-none'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              resetDone ? 'bg-green-50 border-green-200' : resetEnabled ? 'bg-red-50 border-red-200' : 'border-slate-100'
            }`}>
              <div>
                <h2 className="font-semibold text-slate-800">Execute platform reset</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {resetDone
                    ? 'Reset completed successfully.'
                    : resetEnabled
                      ? 'Type the confirmation phrase exactly to proceed. This is immediate and irreversible.'
                      : 'Download the backup above to unlock this step.'}
                </p>
              </div>
            </div>

            <div className="px-6 py-5">
              {resetDone ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Platform reset complete
                  </div>
                  <p className="text-sm text-slate-600">
                    <strong>{resetResult?.tenantsAffected ?? 0}</strong> tenant(s) and all their data have been permanently deleted from the platform.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resetError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{resetError}</p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type <span className="font-bold text-slate-900 font-mono">{CONFIRM_PHRASE}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => { setConfirmText(e.target.value); setResetError(null) }}
                      placeholder={CONFIRM_PHRASE}
                      autoComplete="off"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <Button
                    onClick={handleReset}
                    disabled={confirmText !== CONFIRM_PHRASE || !resetEnabled}
                    isLoading={isResetting}
                    loadingText="Resettingâ€¦"
                    className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset All Tenant Data
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
