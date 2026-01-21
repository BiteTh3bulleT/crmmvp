import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { DealsTable } from '@/components/deals-table'
import { DealsTableSkeleton } from '@/components/deals-table-skeleton'

export default function DealsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Track your sales pipeline and deal progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Link>
        </Button>
      </div>

      <Suspense fallback={<DealsTableSkeleton />}>
        <DealsTable />
      </Suspense>
    </div>
  )
}