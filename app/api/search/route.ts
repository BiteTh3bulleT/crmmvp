import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchEntities } from '@/lib/actions/notes'
import { recordSearch } from '@/lib/usage-metrics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    const results = await searchEntities(query)

    // Record search metrics
    const totalResults = results.companies.length + results.contacts.length + results.deals.length + results.tasks.length
    recordSearch(session.user.id, query, totalResults)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching entities:', error)
    return NextResponse.json(
      { error: 'Failed to search entities' },
      { status: 500 }
    )
  }
}