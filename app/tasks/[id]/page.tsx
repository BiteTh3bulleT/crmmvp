import { notFound } from 'next/navigation'
import { getTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { TaskStatus, RelatedType } from '@prisma/client'

interface TaskPageProps {
  params: { id: string }
}

export default async function TaskPage({ params }: TaskPageProps) {
  try {
    const task = await getTask(params.id)

    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
          <p className="text-muted-foreground">
            Task details and information.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge
                    className={
                      task.status === TaskStatus.DONE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {task.status === TaskStatus.DONE ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {task.status.toLowerCase()}
                  </Badge>
                </div>
              </div>

              {task.dueAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <div className="mt-1 flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {format(new Date(task.dueAt), 'MMMM dd, yyyy')}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="mt-1">
                  {format(new Date(task.createdAt), 'MMMM dd, yyyy')}
                </div>
              </div>

              {task.relatedType !== RelatedType.NONE && task.relatedId && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Related To</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {task.relatedType.toLowerCase()} #{task.relatedId}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full">
                  Mark as {task.status === TaskStatus.DONE ? 'Open' : 'Done'}
                </Button>
                <Button variant="outline" className="w-full">
                  Edit Task
                </Button>
                <Button variant="destructive" className="w-full">
                  Delete Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}