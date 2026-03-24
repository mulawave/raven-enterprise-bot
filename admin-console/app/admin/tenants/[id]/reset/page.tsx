'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { API_ENDPOINTS, ROUTES } from '@/lib/constants'

type TenantSummary = {
  id: string
  name: string
  subscription?: {
    planTier: string
    status: string
    conversationsUsed: number
    conversationsLimit: number
  } | null
}

type ApiTenantResponse = {
  id: string
  name: string
  subscription?: {
    plan_tier: string
    status: string
    conversations_used: number
    conversations_limit: number
  } | null
  error?: { code: string; message: string }
}

type BackupPayload = {
  backup_version: string
  created_at: string
  tenant_id: string
  tenant_name: string
  data: {
    tenant: { name: string; logo_url: string | null; theme: string | null; suspended: boolean }
    subscription: object | null
    invoices: object[]
    usages: object[]
  }
}

type Phase = 'idle' | 'backup_done' | 'reset_done'

export default function TenantResetPage() {
  const params = useParams()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<TenantSummary | null>(null)
  const [isLoadingTenant, setIsLoadingTenant] = useState(true)
  const [tenantError, setTenantError] = useState<string | null>(null)

  // Phase tracks where we are in the workflow
  const [phase, setPhase] = useState<Phase>('idle')
  const [backupTimestamp, setBackupTimestamp] = useState<string | null>(null)
  const backupRef = useRef<BackupPayload | null>(null)

  // Reset step
  const [confirmName, setConfirmName] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Restore step
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoadingTenant(true)
        const data = await api.get<ApiTenantResponse>(`${API_ENDPOINTS.TENANTS}/${tenantId}`)
        if (data.error) {
          setTenantError(data.error.message)
          return
        }
        setTenant({
          id: data.id,
          name: data.name,
          subscription: data.subscription
            ? {
                planTier: data.subscription.plan_tier,
                status: data.subscription.status,
                conversationsUsed: data.subscription.conversations_used,
                conversationsLimit: data.subscription.conversations_limit,
              }
            : null,
        })
      } catch (err: any) {
        setTenantError(err.message || 'Failed to load tenant')
      } finally {
        setIsLoadingTenant(false)
      }
    }
    if (tenantId) load()
  }, [tenantId])

  async function handleDownloadBackup() {
    try {
      const data = await api.get<BackupPayload>(API_ENDPOINTS.TENANT_BACKUP(tenantId))
      backupRef.current = data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raven-backup-${tenantId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setBackupTimestamp(new Date().toLocaleString())
      setPhase('backup_done')
    } catch (err: any) {
      setResetError(err.message || 'Failed to create backup')
    }
  }

  async function handleReset() {
    if (!tenant || confirmName !== tenant.name) return
    setIsResetting(true)
    setResetError(null)
    try {
      const result = await api.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.TENANT_RESET(tenantId),
        {},
      )
      if (!result.success) {
        setResetError('Reset failed. Please try again.')
        return
      }
      setPhase('reset_done')
      setConfirmName('')
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
      let parsed: BackupPayload
      try {
        parsed = JSON.parse(text)
      } catch {
        setRestoreError('Invalid backup file. Must be a valid JSON file downloaded from this page.')
        return
      }
      if (!parsed?.data || parsed?.tenant_id !== tenantId) {
        setRestoreError(
          parsed?.tenant_id !== tenantId
            ? `Backup is for a different tenant (${parsed?.tenant_name ?? 'unknown'}). Cannot restore.`
            : 'Invalid backup format.',
        )
        return
      }
      const result = await api.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.TENANT_RESTORE(tenantId),
        parsed,
      )
      if (!result.success) {
        setRestoreError('Restore failed on server. Please try again.')
        return
      }
      setRestoreSuccess(true)
      setRestoreFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setRestoreError(err.message || 'Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }

  const tenantName = tenant?.name ?? tenantId

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <Link
          href={`${ROUTES.TENANTS}/${tenantId}`}
          className="mt-1 p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Back to tenant"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          {isLoadingTenant ? (
            <div className="h-8 w-64 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
          ) : (
            <h1 className="text-2xl font-bold text-slate-900">
              Reset Tenant:{' '}
              <span className="text-red-600">{tenantName}</span>
            </h1>
          )}
          <p className="text-slate-500 mt-1 text-sm">
            This resets all billing and subscription data, returning the tenant to its default unactivated state.
          </p>
        </div>
      </div>

      {tenantError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {tenantError}
        </div>
      )}

      {/* Impact summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-red-200 rounded-xl p-5 bg-red-50">
          <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Will be wiped
          </h2>
          <ul className="space-y-1.5 text-sm text-red-800">
            {[
              'Active subscription & plan tier',
              'Conversation usage counters',
              'Overage charges accumulated',
              'All invoice records',
              'All usage tracking records',
              'Onboarding completion state',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-red-700" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M6 4.586L9.293 1.293a1 1 0 011.414 1.414L7.414 6l3.293 3.293a1 1 0 01-1.414 1.414L6 7.414l-3.293 3.293a1 1 0 01-1.414-1.414L4.586 6 1.293 2.707a1 1 0 011.414-1.414L6 4.586z" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-green-200 rounded-xl p-5 bg-green-50">
          <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Will be preserved
          </h2>
          <ul className="space-y-1.5 text-sm text-green-800">
            {[
              'All orders and order history',
              'All bookings and booking history',
              'All customer records',
              'All conversation transcripts',
              'All message logs',
              'Tenant user accounts (staff/owner)',
              'Menu items, categories, room types',
              'Admin console settings & config',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-200 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-700" fill="currentColor" viewBox="0 0 12 12">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L5 8.586l5.293-5.293z" clipRule="evenodd" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Current subscription state */}
      {!isLoadingTenant && tenant?.subscription && (
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
          <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">Current subscription state</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Plan</p>
              <p className="font-semibold text-slate-800 capitalize">{tenant.subscription.planTier}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-semibold text-slate-800 capitalize">{tenant.subscription.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversations used</p>
              <p className="font-semibold text-slate-800">{tenant.subscription.conversationsUsed.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Limit</p>
              <p className="font-semibold text-slate-800">{tenant.subscription.conversationsLimit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Backup */}
      <div className={`border-2 rounded-xl p-6 transition-colors ${phase === 'backup_done' || phase === 'reset_done' ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3 mb-1">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${phase === 'backup_done' || phase === 'reset_done' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {phase === 'backup_done' || phase === 'reset_done' ? '✓' : '1'}
          </span>
          <h2 className="text-base font-semibold text-slate-900">Create a backup before resetting</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 ml-10">
          Download a complete JSON backup of the tenant&apos;s current subscription, invoices, and usage data. You will need this file if you ever need to restore the tenant after reset. <strong>The reset button will not be enabled until you download the backup.</strong>
        </p>
        {backupTimestamp && (
          <div className="ml-10 mb-3 flex items-center gap-2 text-sm text-green-700 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Backup downloaded at {backupTimestamp}
          </div>
        )}
        <div className="ml-10">
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isLoadingTenant || !!tenantError}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {phase === 'backup_done' ? 'Re-download Backup' : 'Download Backup'}
          </button>
        </div>
      </div>

      {/* Step 2: Reset */}
      <div className={`border-2 rounded-xl p-6 transition-colors ${phase === 'reset_done' ? 'border-green-300 bg-green-50' : phase === 'backup_done' ? 'border-red-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
        <div className="flex items-center gap-3 mb-1">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${phase === 'reset_done' ? 'bg-green-500 text-white' : phase === 'backup_done' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
            {phase === 'reset_done' ? '✓' : '2'}
          </span>
          <h2 className="text-base font-semibold text-slate-900">Execute reset</h2>
        </div>

        {phase === 'reset_done' ? (
          <div className="ml-10 flex items-center gap-2 text-sm text-green-700 font-medium mt-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tenant has been reset successfully. The tenant will need to complete onboarding and payment again.
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4 ml-10">
              {phase === 'backup_done'
                ? 'Type the tenant name exactly to confirm. This action is immediate and irreversible without the backup file.'
                : 'Complete Step 1 first to enable this section.'}
            </p>
            {phase === 'backup_done' && (
              <div className="ml-10 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type <span className="font-bold text-slate-900">{tenantName}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => { setConfirmName(e.target.value); setResetError(null) }}
                    placeholder={tenantName}
                    className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    disabled={isResetting}
                    autoComplete="off"
                  />
                </div>
                {resetError && (
                  <p className="text-sm text-red-600">{resetError}</p>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isResetting || confirmName !== tenantName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResetting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Resetting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Tenant
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Restore from backup */}
      <div className="border-2 border-amber-200 rounded-xl p-6 bg-amber-50">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-amber-400 text-white">
            ↩
          </span>
          <h2 className="text-base font-semibold text-slate-900">Restore from backup</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 ml-10">
          Use this if something went wrong after a reset and you need to restore the tenant&apos;s subscription, invoices, and usage data from a previously downloaded backup file. This does <strong>not</strong> affect orders, bookings, or customers.
        </p>

        {restoreSuccess && (
          <div className="ml-10 mb-3 flex items-center gap-2 text-sm text-green-700 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tenant restored successfully from backup.
          </div>
        )}
        {restoreError && (
          <p className="ml-10 mb-3 text-sm text-red-600">{restoreError}</p>
        )}

        <div className="ml-10 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select backup file (.json)
            </label>
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
          <button
            type="button"
            onClick={handleRestore}
            disabled={!restoreFile || isRestoring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRestoring ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Restoring…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Restore from Backup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
