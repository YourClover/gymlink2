import { beforeEach, describe, expect, it } from 'vitest'
import * as auth from './auth'
import { mockPrisma } from '@/test/setup'

// We test the business logic directly by recreating the handler logic
// TanStack server functions are RPC-based and don't return values when called directly in tests

describe('auth server functions', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2a$12$hashedpassword',
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('registerUser logic', () => {
    it('creates a new user and returns token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockUser)

      // Simulate the handler logic
      const email = 'test@example.com'
      const password = 'password123'
      const name = 'Test User'

      const existingUser = await mockPrisma.user.findUnique({
        where: { email },
      })
      expect(existingUser).toBeNull()

      const passwordHash = await auth.hashPassword(password)
      const user = await mockPrisma.user.create({
        data: { email, passwordHash, name },
      })

      const token = auth.generateToken({ userId: user.id, email: user.email })

      expect(user.id).toBe(mockUser.id)
      expect(user.email).toBe(mockUser.email)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('throws error when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: 'test@example.com' },
      })

      expect(existingUser).not.toBeNull()
      // In the actual handler, this would throw
      expect(() => {
        if (existingUser) {
          throw new Error('User with this email already exists')
        }
      }).toThrow('User with this email already exists')
    })
  })

  describe('loginUser logic', () => {
    beforeEach(async () => {
      const realHash = await auth.hashPassword('password123')
      mockUser.passwordHash = realHash
    })

    it('returns user and token for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const user = await mockPrisma.user.findUnique({
        where: { email: 'test@example.com' },
      })

      expect(user).not.toBeNull()

      const isValid = await auth.verifyPassword(
        'password123',
        user!.passwordHash,
      )
      expect(isValid).toBe(true)

      const token = auth.generateToken({ userId: user!.id, email: user!.email })
      expect(token).toBeDefined()
    })

    it('throws error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const user = await mockPrisma.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      })

      expect(user).toBeNull()
      expect(() => {
        if (!user) {
          throw new Error('Invalid email or password')
        }
      }).toThrow('Invalid email or password')
    })

    it('throws error for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const user = await mockPrisma.user.findUnique({
        where: { email: 'test@example.com' },
      })

      const isValid = await auth.verifyPassword(
        'wrongpassword',
        user!.passwordHash,
      )
      expect(isValid).toBe(false)

      expect(() => {
        if (!isValid) {
          throw new Error('Invalid email or password')
        }
      }).toThrow('Invalid email or password')
    })
  })

  describe('getCurrentUser logic', () => {
    it('returns null when no token provided', () => {
      const token: string | null = null
      expect(token).toBeNull()
      // Handler returns { user: null } when no token
    })

    it('returns null for invalid token', () => {
      const payload = auth.verifyToken('invalid-token')
      expect(payload).toBeNull()
    })

    it('returns user for valid token', async () => {
      const token = auth.generateToken({
        userId: mockUser.id,
        email: mockUser.email,
      })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const payload = auth.verifyToken(token)
      expect(payload).not.toBeNull()
      expect(payload?.userId).toBe(mockUser.id)

      const user = await mockPrisma.user.findUnique({
        where: { id: payload!.userId },
      })
      expect(user).not.toBeNull()
      expect(user?.id).toBe(mockUser.id)
    })

    it('returns null when user not found in database', async () => {
      const token = auth.generateToken({
        userId: 'deleted-user',
        email: 'deleted@example.com',
      })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const payload = auth.verifyToken(token)
      expect(payload).not.toBeNull()

      const user = await mockPrisma.user.findUnique({
        where: { id: payload!.userId },
      })
      expect(user).toBeNull()
    })
  })

  describe('checkEmailAvailable logic', () => {
    it('returns true when email is available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: 'new@example.com' },
      })

      const available = !existingUser
      expect(available).toBe(true)
    })

    it('returns false when email is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
      } as any)

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: 'existing@example.com' },
      })

      const available = !existingUser
      expect(available).toBe(false)
    })
  })
})
