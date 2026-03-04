'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import { User, Mail, Lock, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/Button'
import { API_BASE_URL } from '@/lib/constants'
import { getAdminToken } from '@/lib/auth'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await api.get<AdminProfile>('/admin/profile')
      setProfile(data)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateField = async (field: keyof AdminProfile, value: string) => {
    if (!profile) return

    setSaving(field)
    try {
      const updated = await api.patch<AdminProfile>('/admin/profile', { [field]: value })
      setProfile(updated)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(null)
    }
  }

  const handleInputChange = (field: keyof AdminProfile, value: string) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  const handleInputBlur = (field: keyof AdminProfile, value: string) => {
    updateField(field, value)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setSaving('password')
    try {
      await api.patch('/admin/profile', { password: passwordData.newPassword })
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-9 w-36 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/2 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-4">
          <div className="h-6 w-44 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-white">Admin Profile</h1>

      {/* Profile Picture Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
        
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={`${API_BASE_URL}${profile.avatar_url}?t=${getAdminToken() ?? ''}`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                <User className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <ImageUpload
              value={profile.avatar_url}
              onChange={(url) => {
                setProfile({ ...profile, avatar_url: url })
              }}
              endpoint="/admin/profile/upload/avatar"
              label="Upload New Avatar"
              maxSize={5 * 1024 * 1024}
            />
          </div>
        </div>
      </div>

      {/* Account Information Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
                {saving === 'name' && (
                  <span className="ml-2 text-xs text-blue-400">Saving...</span>
                )}
              </div>
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={(e) => handleInputBlur('name', e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
                {saving === 'email' && (
                  <span className="ml-2 text-xs text-blue-400">Saving...</span>
                )}
              </div>
            </label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={(e) => handleInputBlur('email', e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </div>
            </label>
            <input
              type="text"
              value={profile.role || 'admin'}
              disabled
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </div>
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="Enter new password"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="Confirm new password"
              minLength={8}
            />
          </div>

          {passwordError && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <p className="text-sm text-red-300">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <p className="text-sm text-green-300">Password updated successfully!</p>
            </div>
          )}

          <Button
            type="submit"
            isLoading={saving === 'password'}
            loadingText="Updating…"
            disabled={saving === 'password' || !passwordData.newPassword || !passwordData.confirmPassword}
            className="px-6 py-2"
          >
            Update Password
          </Button>
        </form>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Auto-save:</strong> Name and email changes are saved automatically. Password changes require clicking the Update Password button.
        </p>
      </div>
    </div>
  )
}
