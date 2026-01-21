import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { confirmAction, cancelAction, getAction } from '@/lib/actions/assistant'
import { recordActionConfirmed } from '@/lib/usage-metrics'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId, action: actionCommand } = body

    if (!actionId || !actionCommand) {
      return NextResponse.json(
        { error: 'Missing actionId or action' },
        { status: 400 }
      )
    }

    if (actionCommand === 'confirm') {
      const startTime = Date.now()
      const result = await confirmAction(actionId)

      // Record metrics
      const executionTime = Date.now() - startTime
      const action = await getAction(actionId) // Get action details for metrics
      recordActionConfirmed(session.user.id, action.actionType, action.threadId, executionTime, result.success)

      return NextResponse.json(result)
    } else if (actionCommand === 'cancel') {
      const result = await cancelAction(actionId)
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: 'Invalid action command. Use "confirm" or "cancel"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Action API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('actionId')

    if (!actionId) {
      return NextResponse.json(
        { error: 'Missing actionId' },
        { status: 400 }
      )
    }

    const action = await getAction(actionId)
    return NextResponse.json(action)
  } catch (error) {
    console.error('Action API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
