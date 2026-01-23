import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: {
      status: 'up' | 'down'
      latencyMs?: number
      error?: string
    }
  }
}

export const getHealthStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HealthStatus> => {
    const timestamp = new Date().toISOString()
    const version = process.env.npm_package_version ?? '1.0.0'

    // Check database connectivity
    let dbStatus: HealthStatus['checks']['database']
    const dbStart = Date.now()

    try {
      // Simple query to verify database connection
      await prisma.$queryRaw`SELECT 1`
      dbStatus = {
        status: 'up',
        latencyMs: Date.now() - dbStart,
      }
    } catch (error) {
      dbStatus = {
        status: 'down',
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      }
    }

    const isHealthy = dbStatus.status === 'up'

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      version,
      checks: {
        database: dbStatus,
      },
    }
  },
)

// Lightweight liveness check (for Kubernetes/Docker health probes)
export const getLivenessStatus = createServerFn({ method: 'GET' }).handler(
  () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  },
)

// Readiness check (includes database connectivity)
export const getReadinessStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ready', timestamp: new Date().toISOString() }
    } catch {
      throw new Error('Database not ready')
    }
  },
)
