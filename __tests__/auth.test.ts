import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

const getAuthorize = () => {
  const provider = authOptions.providers?.find(
    (configuredProvider) => configuredProvider.id === 'credentials'
  ) as { authorize: (credentials: Record<string, string>) => Promise<any> }
  return provider.authorize
}

describe('auth credentials authorize', () => {
  const findUniqueMock = prisma.user.findUnique as jest.Mock
  const compareMock = bcrypt.compare as jest.Mock

  beforeEach(() => {
    findUniqueMock.mockReset()
    compareMock.mockReset()
  })

  it('returns null when credentials are missing', async () => {
    const authorize = getAuthorize()
    await expect(authorize({})).resolves.toBeNull()
  })

  it('returns null when user is not found', async () => {
    const authorize = getAuthorize()
    findUniqueMock.mockResolvedValue(null)

    await expect(
      authorize({ email: 'missing@example.com', password: 'password' })
    ).resolves.toBeNull()
  })

  it('returns null when password does not match', async () => {
    const authorize = getAuthorize()
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hash',
    })
    compareMock.mockResolvedValue(false)

    await expect(
      authorize({ email: 'user@example.com', password: 'wrong' })
    ).resolves.toBeNull()
  })

  it('returns user data when credentials are valid', async () => {
    const authorize = getAuthorize()
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hash',
    })
    compareMock.mockResolvedValue(true)

    await expect(
      authorize({ email: 'user@example.com', password: 'correct' })
    ).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    })
  })
})
