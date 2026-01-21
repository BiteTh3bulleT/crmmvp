import { createCompany } from '@/lib/actions/companies'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      create: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('createCompany', () => {
  const createMock = prisma.company.create as jest.Mock
  const getSessionMock = getServerSession as jest.Mock
  const revalidateMock = revalidatePath as jest.Mock

  beforeEach(() => {
    createMock.mockReset()
    getSessionMock.mockReset()
    revalidateMock.mockReset()
  })

  it('throws when user is not authenticated', async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(createCompany({ name: 'Acme' })).rejects.toThrow(
      'Unauthorized'
    )
  })

  it('validates input before creating a company', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user-1' } })

    await expect(createCompany({ name: '' })).rejects.toThrow(
      'Name is required'
    )
  })

  it('creates company with normalized optional fields', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    createMock.mockResolvedValue({ id: 'company-1', name: 'Acme' })

    await createCompany({ name: 'Acme', website: '' })

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: 'Acme',
        website: null,
        phone: null,
        address: null,
        ownerUserId: 'user-1',
      },
    })
    expect(revalidateMock).toHaveBeenCalledWith('/companies')
  })
})
