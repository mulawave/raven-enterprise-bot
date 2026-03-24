'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import { User, Mail, Lock, Shield, Camera } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/Button'
import { API_BASE_URL } from '@/lib/constants'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import AuthenticatedImage from '@/components/AuthenticatedImage'

interface AdminProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nameDraft, setNameDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [isSavingInfo, setIsSavingInfo] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isSavingPw, setIsSavingPw] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const data = await api.get<AdminProfile>('/admin/profile')
      setProfile(data)
      setNameDraft(data.name ?? '')
      setEmailDraft(data.email ?? '')
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveInfo = async () => {
    if (!profile) return
    setIsSavingInfo(true); setInfoError(null); setInfoSuccess(false)
    try {
      const updated = await api.patch<AdminProfile>('/admin/profile', { name: nameDraft, email: emailDraft })
      setProfile(updated); setInfoSuccess(true)
      setTimeout(() => setInfoSuccess(false), 3000)
    } catch (err: any) {
      setInfoError(err?.message ?? 'Save failed')
    } finally {
      setIsSavingInfo(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPasswordError(null); setPasswordSuccess(false)
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match'); return
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters'); return
    }
    setIsSavingPw(true)
    try {
      await api.patch('/admin/profile', { password: passwordData.newPassword })
      setPasswordSuccess(true)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err?.message ?? 'Failed to update password')
    } finally {
      setIsSavingPw(false)
    }
  }

  const handleAvatarChange = async (url: string) => {
    setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev)
    try { await api.patch('/admin/profile', { avatar_url: url }) } catch {}
  }

  const S = 'animate-pulse bg-slate-200 rounded'
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COL: Avatar + Account Info */}
        <div className="space-y-5">
          {/* Avatar card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-500" />Profile Photo
            </h2>
            <div className="flex flex-col items-center gap-4">
              {isLoading ? (
                <div className={`${S} w-28 h-28 rounded-full`} />
              ) : profile?.avatar_url ? (
                <AuthenticatedImage
                  src={`${API_BASE_URL}${profile.avatar_url}`}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover border-4 border-slate-200 ring-2 ring-indigo-500/30"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-slate-200 ring-2 ring-indigo-500/20 flex items-center justify-center">
                  <User className="h-14 w-14 text-slate-400" />
                </div>
              )}
              <ImageUpload
                value={null}
                onChange={handleAvatarChange}
                endpoint="/admin/profile/upload/avatar"
                label="Upload New Photo"
                maxSize={5 * 1024 * 1024}
              />
            </div>
          </div>

          {/* Role / metadata card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />Account Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500">Role</span>
                <span className="text-slate-900 font-medium capitalize">{isLoading ? <span className={`${S} inline-block h-4 w-20`} /> : (profile?.role ?? 'admin')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500">Account ID</span>
                <span className="text-slate-600 font-mono text-xs">{isLoading ? <span className={`${S} inline-block h-4 w-28`} /> : profile?.id?.slice(0, 16)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-600 text-xs">{isLoading ? <span className={`${S} inline-block h-4 w-28`} /> : (profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Account info form + password */}
        <div className="space-y-5">
          {/* Account info */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-500" />Account Information
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />Display Name
              </label>
              {isLoading ? <div className={`${S} h-10 w-full`} /> : (
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors"
                  placeholder="Enter your name"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />Email Address
              </label>
              {isLoading ? <div className={`${S} h-10 w-full`} /> : (
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors"
                  placeholder="admin@example.com"
                />
              )}
            </div>
            {infoError && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{infoError}</div>}
            {infoSuccess && <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Profile updated</div>}
            <Button isLoading={isSavingInfo} loadingText="Saving..." onClick={handleSaveInfo} disabled={isLoading} className="w-full">
              Save Profile
            </Button>
          </div>

          {/* Password change */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-500" />Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors"
                  placeholder="Repeat new password"
                />
              </div>
              {passwordError && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{passwordError}</div>}
              {passwordSuccess && <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Password updated</div>}
              <Button type="submit" isLoading={isSavingPw} loadingText="Updating..." disabled={!passwordData.newPassword} className="w-full">
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
