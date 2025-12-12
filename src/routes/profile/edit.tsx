import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUserProfile, updateUserProfile } from '@/lib/profile.server'
import AppLayout from '@/components/AppLayout'

export const Route = createFileRoute('/profile/edit')({
  component: ProfileEditPage,
})

interface ProfileData {
  username: string
  bio: string | null
  isPrivate: boolean
  showAchievements: boolean
  showStats: boolean
  profileCode: string
}

function ProfileEditPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [bio, setBio] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [showAchievements, setShowAchievements] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserProfile({ data: { userId: user.id } }).then((result) => {
      if (result.profile) {
        setProfile({
          username: result.profile.username,
          bio: result.profile.bio,
          isPrivate: result.profile.isPrivate,
          showAchievements: result.profile.showAchievements,
          showStats: result.profile.showStats,
          profileCode: result.profile.profileCode,
        })
        setBio(result.profile.bio ?? '')
        setIsPrivate(result.profile.isPrivate)
        setShowAchievements(result.profile.showAchievements)
        setShowStats(result.profile.showStats)
      }
      setIsLoading(false)
    })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await updateUserProfile({
        data: { userId: user.id, bio, isPrivate, showAchievements, showStats },
      })
      navigate({ to: '/profile' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Edit Profile" showNav={false}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!profile) {
    return (
      <AppLayout title="Edit Profile" showNav={false}>
        <div className="p-4 text-center">
          <p className="text-zinc-400 mb-4">
            You need to set up your profile first.
          </p>
          <button
            onClick={() => navigate({ to: '/profile/setup' })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Set Up Profile
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Username (read-only) */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-1">Username</label>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-zinc-500">
            @{profile.username}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Username cannot be changed
          </p>
        </div>

        {/* Profile Code */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-1">
            Profile Code
          </label>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-zinc-300 font-mono">
            {profile.profileCode}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Share this code for others to find your profile
          </p>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-blue-500"
            placeholder="Tell others about yourself..."
          />
          <p className="text-xs text-zinc-500 mt-1">{bio.length}/160</p>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Privacy</h2>

          <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-white font-medium">Private Profile</p>
              <p className="text-sm text-zinc-500">
                Only followers can see your activity
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-white font-medium">Show Achievements</p>
              <p className="text-sm text-zinc-500">
                Display earned badges on your profile
              </p>
            </div>
            <input
              type="checkbox"
              checked={showAchievements}
              onChange={(e) => setShowAchievements(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-white font-medium">Show Stats</p>
              <p className="text-sm text-zinc-500">
                Display workout statistics on your profile
              </p>
            </div>
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
          </label>
        </div>
      </div>
    </AppLayout>
  )
}
