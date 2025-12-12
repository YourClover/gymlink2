import { createFileRoute } from '@tanstack/react-router'
import { getHealthStatus } from '@/lib/health.server'

export const Route = createFileRoute('/health')({
  loader: async () => {
    const health = await getHealthStatus()
    return health
  },
  component: HealthPage,
})

function HealthPage() {
  const health = Route.useLoaderData()

  return (
    <pre className="p-4 bg-zinc-900 text-white font-mono text-sm">
      {JSON.stringify(health, null, 2)}
    </pre>
  )
}
