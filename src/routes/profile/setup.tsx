import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { checkUsernameAvailable, createUserProfile } from '@/lib/profile.server'
import { Check, X, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/profile/setup')({
  component: ProfileSetupPage,
})

function ProfileSetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounced availability check
  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null)
      return
    }
    setIsChecking(true)
    try {
      const result = await checkUsernameAvailable({ data: { username: value } })
      setIsAvailable(result.available)
    } catch {
      setIsAvailable(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
    setUsername(value)
    checkAvailability(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isAvailable) return

    setIsSubmitting(true)
    setError(null)
    try {
      await createUserProfile({ data: { userId: user.id, username } })
      navigate({ to: '/profile' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">
          Choose your username
        </h1>
        <p className="text-zinc-400 mb-6">
          This is how others will find and identify you on GymLink.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pl-8 text-white focus:outline-none focus:border-blue-500"
                placeholder="username"
                maxLength={20}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {!isChecking && isAvailable === false && (
                  <X className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              3-20 characters, letters, numbers, underscores
            </p>
            {isAvailable === false && (
              <p className="text-xs text-red-400 mt-1">
                Username is not available
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!isAvailable || isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
