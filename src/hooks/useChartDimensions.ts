import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 639px)'

export function useChartDimensions() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(MOBILE_QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { compact }
}
