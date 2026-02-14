import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  subtitle?: string
  headerAction?: ReactNode
  children: ReactNode
  style?: React.CSSProperties
}

export default function StatsSection({
  icon,
  title,
  subtitle,
  headerAction,
  children,
  style,
}: Props) {
  return (
    <section style={style}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-zinc-400 w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </span>
        <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
        {subtitle && (
          <span className="text-xs text-zinc-500 ml-auto">{subtitle}</span>
        )}
        {headerAction && !subtitle && (
          <span className="ml-auto">{headerAction}</span>
        )}
        {headerAction && subtitle && <span className="ml-2">{headerAction}</span>}
      </div>
      {children}
    </section>
  )
}
