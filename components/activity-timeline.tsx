import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Clock, TrendingUp, User, Building2 } from 'lucide-react'
import { RelatedType } from '@prisma/client'

interface Activity {
  id: string
  type: 'note' | 'task_completed' | 'deal_stage_changed' | 'contact_created' | 'company_created'
  title: string
  description: string
  createdAt: Date
  data?: any
}

interface ActivityTimelineProps {
  activities: Activity[]
  relatedType: RelatedType
  relatedId: string
}

const activityIcons = {
  note: FileText,
  task_completed: TrendingUp,
  deal_stage_changed: TrendingUp,
  contact_created: User,
  company_created: Building2,
}

const activityColors = {
  note: 'bg-blue-100 text-blue-800',
  task_completed: 'bg-green-100 text-green-800',
  deal_stage_changed: 'bg-purple-100 text-purple-800',
  contact_created: 'bg-orange-100 text-orange-800',
  company_created: 'bg-indigo-100 text-indigo-800',
}

export function ActivityTimeline({ activities, relatedType, relatedId }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No activity yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Activities will appear here as you interact with this {relatedType.toLowerCase()}.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Activity Timeline ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type] || FileText
            const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-800'

            return (
              <div key={activity.id} className="flex items-start space-x-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < activities.length - 1 && (
                    <div className="w-px h-8 bg-border mt-2" />
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{activity.title}</h4>
                    <time
                      className="text-xs text-muted-foreground"
                      title={format(new Date(activity.createdAt), 'PPP p')}
                    >
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </time>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                  )}

                  {activity.type === 'note' && activity.data?.body && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{activity.data.body}</p>
                    </div>
                  )}

                  {/* Activity-specific actions */}
                  {activity.type === 'note' && (
                    <div className="mt-2 flex space-x-2">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}