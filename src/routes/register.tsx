import { useCallback, useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { checkEmailAvailable } from '@/lib/auth.server'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

// Password strength calculation
type PasswordStrength = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak'

  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)

  if (hasNumber && hasSymbol && hasUppercase) return 'strong'
  if (hasNumber || hasSymbol) return 'medium'
  return 'weak'
}

function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '#ef4444' // red-500
    case 'medium':
      return '#eab308' // yellow-500
    case 'strong':
      return '#22c55e' // green-500
  }
}

function getStrengthWidth(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '33%'
    case 'medium':
      return '66%'
    case 'strong':
      return '100%'
  }
}

// Validation icon components
function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      className="w-5 h-5 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="w-5 h-5 text-blue-400 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  )
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [emailCheckError, setEmailCheckError] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  // Derived validation states
  const nameValid = name.length >= 2
  const emailFormatValid = EMAIL_REGEX.test(email)
  const passwordStrength = getPasswordStrength(password)
  const passwordValid = password.length >= 8
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0

  // Debounced email check
  const checkEmail = useCallback(async (emailToCheck: string) => {
    if (!EMAIL_REGEX.test(emailToCheck)) {
      setEmailAvailable(null)
      setEmailCheckError(false)
      return
    }

    setIsCheckingEmail(true)
    setEmailCheckError(false)
    try {
      const result = await checkEmailAvailable({
        data: { email: emailToCheck },
      })
      setEmailAvailable(result.available)
    } catch {
      setEmailAvailable(null)
      setEmailCheckError(true)
    } finally {
      setIsCheckingEmail(false)
    }
  }, [])

  useEffect(() => {
    if (!email || !emailFormatValid) {
      setEmailAvailable(null)
      setEmailCheckError(false)
      return
    }

    const timeoutId = setTimeout(() => {
      checkEmail(email)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [email, emailFormatValid, checkEmail])

  const isFormValid =
    nameValid &&
    emailFormatValid &&
    emailAvailable !== false && // Allow null (not checked yet) or true - server validates anyway
    passwordValid &&
    passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) return

    try {
      await register(email, password, name)
    } catch {
      // Error is handled in context
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Get Started</h1>
          <p className="text-zinc-400">
            Create your account and start tracking
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <p>{error}</p>
            <button
              onClick={clearError}
              className="text-sm underline mt-1 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Name
            </label>
            <div className="relative">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 pr-10 rounded-lg bg-zinc-700/50 border border-zinc-600 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
              {nameTouched && name.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameValid ? <CheckIcon /> : <XIcon />}
                </div>
              )}
            </div>
            {nameTouched && !nameValid && name.length > 0 && (
              <p className="mt-1 text-sm text-red-400">
                Name must be at least 2 characters
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 pr-10 rounded-lg bg-zinc-700/50 border border-zinc-600 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingEmail && <LoadingSpinner />}
                {!isCheckingEmail && emailTouched && email.length > 0 && (
                  <>
                    {!emailFormatValid && <XIcon />}
                    {emailFormatValid && emailAvailable === true && (
                      <CheckIcon />
                    )}
                    {emailFormatValid && emailAvailable === false && <XIcon />}
                  </>
                )}
              </div>
            </div>
            {emailTouched && email.length > 0 && (
              <>
                {!emailFormatValid && (
                  <p className="mt-1 text-sm text-red-400">
                    Please enter a valid email
                  </p>
                )}
                {emailFormatValid && emailAvailable === false && (
                  <p className="mt-1 text-sm text-red-400">
                    This email is already taken
                  </p>
                )}
                {emailFormatValid && emailAvailable === true && (
                  <p className="mt-1 text-sm text-green-400">
                    Email is available
                  </p>
                )}
                {emailFormatValid && emailCheckError && (
                  <p className="mt-1 text-sm text-yellow-400">
                    Could not verify email - try again
                  </p>
                )}
              </>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-10 rounded-lg bg-zinc-700/50 border border-zinc-600 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      backgroundColor: getStrengthColor(passwordStrength),
                      width: getStrengthWidth(passwordStrength),
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span
                    className="text-xs"
                    style={{ color: getStrengthColor(passwordStrength) }}
                  >
                    {passwordStrength.charAt(0).toUpperCase() +
                      passwordStrength.slice(1)}
                  </span>
                  {!passwordValid && (
                    <span className="text-xs text-zinc-500">
                      Min 8 characters
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-20 rounded-lg bg-zinc-700/50 border border-zinc-600 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {confirmTouched &&
                  confirmPassword.length > 0 &&
                  (passwordsMatch ? <CheckIcon /> : <XIcon />)}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {confirmTouched &&
              confirmPassword.length > 0 &&
              !passwordsMatch && (
                <p className="mt-1 text-sm text-red-400">
                  Passwords do not match
                </p>
              )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-zinc-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
