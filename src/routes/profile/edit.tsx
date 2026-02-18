import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Save, UserCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUserProfile, updateUserProfile } from '@/lib/profile.server'
import AppLayout from '@/components/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { SkeletonFormField } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'

export const Route = createFileRoute('/profile/edit')({
  component: ProfileEditPage,
})

interface ProfileData {
  username: string
  bio: string | null
  profileCode: string
}

function ProfileEditPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [bio, setBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserProfile({ data: { userId: user.id } }).then((result) => {
      if (result.profile) {
        setProfile({
          username: result.profile.username,
          bio: result.profile.bio,
          profileCode: result.profile.profileCode,
        })
        setBio(result.profile.bio ?? '')
      }
      setIsLoading(false)
    })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await updateUserProfile({
        data: { userId: user.id, bio },
      })
      navigate({ to: '/profile' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Edit Profile" showNav={false}>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="w-16 h-8 rounded-lg" />
          </div>
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
        </div>
      </AppLayout>
    )
  }

  if (!profile) {
    return (
      <AppLayout title="Edit Profile" showNav={false}>
        <EmptyState
          icon={<UserCircle className="w-8 h-8" />}
          title="Set up your profile first"
          description="Create your profile to start editing it."
          action={{
            label: 'Set Up Profile',
            onClick: () => navigate({ to: '/profile/setup' }),
          }}
        />
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
        <div
          className="mb-6 animate-fade-in"
          style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
        >
          <label className="block text-sm text-zinc-400 mb-1">Username</label>
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-zinc-500">
            @{profile.username}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Username cannot be changed
          </p>
        </div>

        {/* Profile Code */}
        <div
          className="mb-6 animate-fade-in"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
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
        <div
          className="mb-6 animate-fade-in"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
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
      </div>
    </AppLayout>
  )
}
