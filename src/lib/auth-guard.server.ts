import { prisma } from './db.server'
import { verifyToken } from './auth'

export interface AuthResult {
  userId: string
  email: string
  isAdmin: boolean
}

export async function requireAuth(token: string | null): Promise<AuthResult> {
  if (!token) {
    throw new Error('Authentication required')
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw new Error('Invalid or expired token')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, isAdmin: true, deletedAt: true },
  })

  if (!user || user.deletedAt) {
    throw new Error('User not found')
  }

  return { userId: user.id, email: user.email, isAdmin: user.isAdmin }
}

export async function requireAdmin(token: string | null): Promise<AuthResult> {
  const auth = await requireAuth(token)
  if (!auth.isAdmin) {
    throw new Error('Admin access required')
  }
  return auth
}
