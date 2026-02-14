import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import {
  generateToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} from './auth'
import { EMAIL_REGEX, PASSWORD_MIN_LENGTH } from './constants'
import type { JWTPayload } from './auth'

// Development-only logging helper
const isDev = process.env.NODE_ENV !== 'production'
const log = (message: string, data?: object) => {
  if (isDev) console.log(`[AUTH] ${message}`, data ?? '')
}
const logError = (message: string, data?: object) => {
  if (isDev) console.error(`[AUTH] ${message}`, data ?? '')
}

function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email format')
  }
}

function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    )
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number')
  }
}

function validateName(name: string): void {
  if (name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters')
  }
  if (name.trim().length > 100) {
    throw new Error('Name must be less than 100 characters')
  }
}

// Server functions for authentication
// These can be called from client code via RPC

// Register a new user
export const registerUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; name: string }) => {
    validateEmail(data.email)
    validatePassword(data.password)
    validateName(data.name)
    return data
  })
  .handler(async ({ data }) => {
    const { email, password, name } = data
    log('Register attempt:', { email, name })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      log('Register failed: Email already exists:', { email })
      throw new Error('User with this email already exists')
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email })

    log('Register success:', { userId: user.id, email: user.email })
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
      token,
    }
  })

// Login user
export const loginUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => {
    validateEmail(data.email)
    if (!data.password) {
      throw new Error('Password is required')
    }
    return data
  })
  .handler(async ({ data }) => {
    const { email, password } = data
    log('Login attempt:', { email })

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      log('Login failed: User not found:', { email })
      throw new Error('Invalid email or password')
    }

    // Check if user has been soft deleted
    if (user.deletedAt) {
      log('Login failed: Account deleted:', { email })
      throw new Error('This account has been deleted')
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      log('Login failed: Invalid password for:', { email })
      throw new Error('Invalid email or password')
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email })

    log('Login success:', { userId: user.id, email: user.email })
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
      token,
    }
  })

// Logout user (just returns success, client handles token removal)
export const logoutUser = createServerFn({ method: 'POST' }).handler(() => {
  return { success: true }
})

// Check if email is available
export const checkEmailAvailable = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => {
    validateEmail(data.email)
    return data
  })
  .handler(async ({ data }) => {
    log('Email availability check:', { email: data.email })
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      })
      const available = !existingUser
      log('Email availability result:', { email: data.email, available })
      return { available }
    } catch (error) {
      logError('Email availability check error:', { email: data.email, error })
      throw error
    }
  })

// Verify token and get user
export const getCurrentUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { token } = data
    log('Get current user:', { hasToken: !!token })

    if (!token) {
      log('Get current user: No token provided')
      return { user: null }
    }

    const payload = verifyToken(token)
    if (!payload) {
      log('Get current user: Invalid token')
      return { user: null }
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        preferences: true,
      },
    })

    if (!user) {
      log('Get current user: User not found for token')
      return { user: null }
    }

    // Issue a fresh token to extend the session lifetime
    const freshToken = generateToken({
      userId: user.id,
      email: user.email,
    } as JWTPayload)

    log('Get current user success:', { userId: user.id, email: user.email })
    return { user, token: freshToken }
  })
