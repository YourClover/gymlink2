import type { CompareUserProfile } from '@/lib/compare.server'
import Avatar from '@/components/ui/Avatar'

function CompareAvatar({
  profile,
  side,
}: {
  profile: CompareUserProfile
  side: 'left' | 'right'
}) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <Avatar
        name={profile.name}
        avatarUrl={profile.avatarUrl}
        size="xl"
        className={
          side === 'left'
            ? 'bg-gradient-to-br from-blue-600 to-blue-400'
            : 'bg-gradient-to-br from-purple-600 to-purple-400'
        }
      />
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
      <CompareAvatar profile={me} side="left" />
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <span className="text-xs font-bold text-zinc-400">VS</span>
      </div>
      <CompareAvatar profile={them} side="right" />
    </div>
  )
}
