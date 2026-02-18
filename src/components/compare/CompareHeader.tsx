import type { CompareUserProfile } from '@/lib/compare.server'

function Avatar({
  profile,
  side,
}: {
  profile: CompareUserProfile
  side: 'left' | 'right'
}) {
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 ${
          side === 'left'
            ? 'bg-gradient-to-br from-blue-600 to-blue-400'
            : 'bg-gradient-to-br from-purple-600 to-purple-400'
        }`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="text-center min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {profile.name}
        </p>
        <p className="text-xs text-zinc-500 truncate">@{profile.username}</p>
      </div>
    </div>
  )
}

export default function CompareHeader({
  me,
  them,
}: {
  me: CompareUserProfile
  them: CompareUserProfile
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <Avatar profile={me} side="left" />
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <span className="text-xs font-bold text-zinc-400">VS</span>
      </div>
      <Avatar profile={them} side="right" />
    </div>
  )
}
