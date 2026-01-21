import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// Validate required environment variables at startup
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable is required. Generate one with: openssl rand -base64 32'
  )
}

// 8 hours in production, 24 hours in development
const JWT_MAX_AGE_SECONDS = process.env.NODE_ENV === 'production'
  ? 60 * 60 * 8
  : 60 * 60 * 24

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Query user - the lockout fields may not exist if migration hasn't run
        let user
        try {
          user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })
        } catch (error) {
          console.error('Error finding user:', error)
          return null
        }

        if (!user) {
          return null
        }

        // Check if account is locked (only if field exists in DB)
        // Use type assertion since fields may not exist pre-migration
        const userWithLockout = user as typeof user & {
          failedLoginAttempts?: number
          lockedUntil?: Date | null
          lastFailedLogin?: Date | null
        }

        if (userWithLockout.lockedUntil && userWithLockout.lockedUntil > new Date()) {
          // Account is still locked
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          // Try to increment failed attempts (may fail if columns don't exist yet)
          try {
            const currentFailedAttempts = userWithLockout.failedLoginAttempts ?? 0
            const newFailedAttempts = currentFailedAttempts + 1
            const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newFailedAttempts,
                lastFailedLogin: new Date(),
                lockedUntil: shouldLock
                  ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                  : null,
              },
            })
          } catch {
            // Lockout fields may not exist yet - continue without lockout tracking
          }

          return null
        }

        // Successful login - reset failed attempts (if fields exist)
        const failedLoginAttempts = userWithLockout.failedLoginAttempts ?? 0
        if (failedLoginAttempts > 0 || userWithLockout.lockedUntil) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastFailedLogin: null,
              },
            })
          } catch {
            // Lockout fields may not exist yet - continue without reset
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: JWT_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: JWT_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  }
}
