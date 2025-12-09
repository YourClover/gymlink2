import { describe, expect, it } from 'vitest'
import {
  generateToken,
  hashPassword,
  parseAuthHeader,
  verifyPassword,
  verifyToken,
} from './auth'

describe('auth utilities', () => {
  describe('hashPassword', () => {
    it('returns a hashed string different from input', async () => {
      const password = 'password123'
      const hash = await hashPassword(password)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('produces different hashes for same password (salted)', async () => {
      const password = 'password123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      const password = 'password123'
      const hash = await hashPassword(password)

      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it('returns false for non-matching password', async () => {
      const hash = await hashPassword('password123')

      const result = await verifyPassword('wrongpassword', hash)
      expect(result).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('returns a JWT string', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateToken(payload)

      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('verifyToken', () => {
    it('returns payload for valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateToken(payload)

      const result = verifyToken(token)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe(payload.userId)
      expect(result?.email).toBe(payload.email)
    })

    it('returns null for invalid token', () => {
      const result = verifyToken('invalid-token')
      expect(result).toBeNull()
    })

    it('returns null for tampered token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateToken(payload)
      const tamperedToken = token.slice(0, -5) + 'xxxxx'

      const result = verifyToken(tamperedToken)
      expect(result).toBeNull()
    })
  })

  describe('parseAuthHeader', () => {
    it('extracts token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      const header = `Bearer ${token}`

      const result = parseAuthHeader(header)
      expect(result).toBe(token)
    })

    it('returns null for null header', () => {
      const result = parseAuthHeader(null)
      expect(result).toBeNull()
    })

    it('returns null for header without Bearer prefix', () => {
      const result = parseAuthHeader('some-token')
      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseAuthHeader('')
      expect(result).toBeNull()
    })
  })
})
