import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, Clock, Users } from 'lucide-react'
import { getDashboardStats } from '@/lib/actions/dashboard'

export async function DashboardStats() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: 'Open Deals',
      value: stats.openDealsCount,
      icon: Target,
      description: 'Active deals in pipeline',
    },
    {
      title: 'Won This Month',
      value: stats.wonThisMonthCount,
      icon: TrendingUp,
      description: 'Deals closed this month',
    },
    {
      title: 'Tasks Due Soon',
      value: stats.tasksDueSoonCount,
      icon: Clock,
      description: 'Due within 7 days',
    },
    {
      title: 'Total Contacts',
      value: stats.totalContactsCount,
      icon: Users,
      description: 'People in your CRM',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}