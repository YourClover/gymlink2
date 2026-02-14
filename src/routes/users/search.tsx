import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, Loader2, QrCode, Search, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getProfileByCode, searchUsers } from '@/lib/profile.server'
import AppLayout from '@/components/AppLayout'
import { FollowButton } from '@/components/social/FollowButton'
import { SkeletonUserCard } from '@/components/ui/SocialSkeletons'
import EmptyState from '@/components/ui/EmptyState'

export const Route = createFileRoute('/users/search')({
  component: UserSearchPage,
})

interface UserResult {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  followStatus: string | null
  user: { id: string; name: string }
}

function UserSearchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<UserResult>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [profileCodeInput, setProfileCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!user || searchQuery.length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        const result = await searchUsers({
          data: { query: searchQuery, userId: user.id, limit: 20 },
        })
        setResults(result.users as Array<UserResult>)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    },
    [user],
  )

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 300)
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileCodeInput.trim()) return

    setIsCheckingCode(true)
    setCodeError(null)

    try {
      const result = await getProfileByCode({
        data: { profileCode: profileCodeInput.trim() },
      })

      if (result.profile) {
        navigate({
          to: '/u/$username',
          params: { username: result.profile.username },
        })
      } else {
        setCodeError('Profile not found with this code')
      }
    } catch (error) {
      setCodeError('Failed to lookup profile code')
    } finally {
      setIsCheckingCode(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <AppLayout showNav={false}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: '/profile' })}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
            aria-label="Back to profile"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Find People</h1>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by username or name..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 animate-spin" />
          )}
        </div>

        {/* Profile Code Lookup */}
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-zinc-400" />
            <h2 className="text-sm font-medium text-white">
              Have a profile code?
            </h2>
          </div>
          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <input
              type="text"
              value={profileCodeInput}
              onChange={(e) =>
                setProfileCodeInput(e.target.value.toUpperCase())
              }
              placeholder="Enter 8-character code"
              maxLength={8}
              className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isCheckingCode || profileCodeInput.length !== 8}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium"
            >
              {isCheckingCode ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Go'
              )}
            </button>
          </form>
          {codeError && (
            <p className="text-red-400 text-sm mt-2">{codeError}</p>
          )}
        </div>

        {/* Search Results */}
        {isSearching && results.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonUserCard key={i} />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Results</h3>
            {results.map((result, index) => (
              <div
                key={result.id}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors animate-fade-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <Link
                  to="/u/$username"
                  params={{ username: result.username }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {result.avatarUrl ? (
                      <img
                        src={result.avatarUrl}
                        alt={`${result.user.name}'s profile picture`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(result.user.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {result.user.name}
                    </p>
                    <p className="text-sm text-zinc-500">@{result.username}</p>
                  </div>
                </Link>
                <div className="w-24">
                  <FollowButton
                    userId={result.userId}
                    currentStatus={result.followStatus}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : query.length >= 2 && !isSearching ? (
          <EmptyState
            icon={<User className="w-8 h-8" />}
            title="No users found"
            description={`No results for "${query}". Try a different search.`}
          />
        ) : query.length > 0 && query.length < 2 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500">
              Type at least 2 characters to search
            </p>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
