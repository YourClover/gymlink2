const sizeMap = {
  xs: 'w-9 h-9 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
} as const

const variantMap = {
  solid: 'bg-blue-600',
  gradient: 'bg-gradient-to-br from-blue-600 to-purple-600',
} as const

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: keyof typeof sizeMap
  variant?: keyof typeof variantMap
  className?: string
}

export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
  variant = 'solid',
  className,
}: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${sizeMap[size]} ${variantMap[variant]} ${className ?? ''}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name}'s profile picture`}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
