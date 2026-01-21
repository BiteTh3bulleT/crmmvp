import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, Plus, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { DealStage } from '@prisma/client'

interface Deal {
  id: string
  title: string
  amountCents: number | null
  stage: DealStage
  closeDate: Date | null
  createdAt: Date
  contact: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface CompanyDealsProps {
  companyId: string
  deals: Deal[]
}

const stageColors = {
  [DealStage.LEAD]: 'bg-gray-100 text-gray-800',
  [DealStage.QUALIFIED]: 'bg-blue-100 text-blue-800',
  [DealStage.PROPOSAL]: 'bg-yellow-100 text-yellow-800',
  [DealStage.NEGOTIATION]: 'bg-orange-100 text-orange-800',
  [DealStage.WON]: 'bg-green-100 text-green-800',
  [DealStage.LOST]: 'bg-red-100 text-red-800',
}

export function CompanyDeals({ companyId, deals }: CompanyDealsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Deals ({deals.length})
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/deals/new?companyId=${companyId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {deals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No deals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start building your pipeline with this company.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href={`/deals/new?companyId=${companyId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Deal
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {deal.title}
                    </Link>
                    {deal.contact && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {deal.contact.firstName} {deal.contact.lastName}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-1">
                      {deal.amountCents && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <DollarSign className="mr-1 h-3 w-3" />
                          ${(deal.amountCents / 100).toLocaleString()}
                        </div>
                      )}
                      {deal.closeDate && (
                        <div className="text-xs text-muted-foreground">
                          Close: {format(new Date(deal.closeDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={stageColors[deal.stage]}>
                    {deal.stage.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}