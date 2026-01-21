'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Loader2,
  ListTodo,
  FileText,
  Target,
  RefreshCw,
  User,
  Building2
} from 'lucide-react'
import { ActionType, ActionStatus } from '@prisma/client'
import { formatActionForDisplay } from '@/lib/assistant-schemas'

interface ActionPreviewCardProps {
  actionId: string
  actionType: ActionType
  payload: Record<string, unknown>
  status: ActionStatus
  summary?: string
  onConfirm: (actionId: string) => Promise<void>
  onCancel: (actionId: string) => Promise<void>
}

const actionIcons: Record<ActionType, React.ElementType> = {
  CREATE_TASK: ListTodo,
  CREATE_NOTE: FileText,
  CREATE_DEAL: Target,
  UPDATE_DEAL_STAGE: RefreshCw,
  UPDATE_CONTACT: User,
  UPDATE_COMPANY: Building2
}

const actionLabels: Record<ActionType, string> = {
  CREATE_TASK: 'Create Task',
  CREATE_NOTE: 'Add Note',
  CREATE_DEAL: 'Create Deal',
  UPDATE_DEAL_STAGE: 'Update Deal Stage',
  UPDATE_CONTACT: 'Update Contact',
  UPDATE_COMPANY: 'Update Company'
}

const statusColors: Record<ActionStatus, string> = {
  PROPOSED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  EXECUTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  FAILED: 'bg-red-100 text-red-800'
}

export function ActionPreviewCard({
  actionId,
  actionType,
  payload,
  status,
  summary,
  onConfirm,
  onCancel
}: ActionPreviewCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const Icon = actionIcons[actionType] || ListTodo

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(actionId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await onCancel(actionId)
    } finally {
      setIsLoading(false)
    }
  }

  const displayText = summary || formatActionForDisplay(actionType, payload)

  return (
    <Card className="border-indigo-200 bg-indigo-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Icon className="w-4 h-4 text-indigo-600" />
            </div>
            <CardTitle className="text-sm font-medium">
              {actionLabels[actionType]}
            </CardTitle>
          </div>
          <Badge className={statusColors[status]}>{status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="py-2">
        <CardDescription className="text-gray-700">
          {displayText}
        </CardDescription>

        {/* Show payload details */}
        <div className="mt-3 p-2 bg-white rounded border border-gray-200 text-xs font-mono">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-gray-500">{key}:</span>
              <span className="text-gray-900 truncate">
                {typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      {status === 'PROPOSED' && (
        <CardFooter className="pt-2 gap-2">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </CardFooter>
      )}

      {status === 'EXECUTED' && (
        <CardFooter className="pt-2">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Action completed successfully
          </div>
        </CardFooter>
      )}

      {status === 'FAILED' && (
        <CardFooter className="pt-2">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            Action failed
          </div>
        </CardFooter>
      )}

      {status === 'CANCELLED' && (
        <CardFooter className="pt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <XCircle className="w-4 h-4" />
            Action cancelled
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
