import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { CompaniesTable } from '@/components/companies-table'
import { CompaniesTableSkeleton } from '@/components/companies-table-skeleton'

export default function CompaniesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage your company relationships and contacts.
          </p>
        </div>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CompaniesTableSkeleton />}>
        <CompaniesTable />
      </Suspense>
    </div>
  )
}