import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCompany } from '@/lib/actions/companies'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  Target,
  Edit,
  Plus,
} from 'lucide-react'
import { CompanyNotes } from '@/components/company-notes'
import { CompanyContacts } from '@/components/company-contacts'
import { CompanyDeals } from '@/components/company-deals'

interface CompanyPageProps {
  params: { id: string }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  try {
    const company = await getCompany(params.id)

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">
              Company details and relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/companies/${company.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/contacts/new?companyId=${company.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Company Info */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-sm">{company.name}</p>
                </div>

                {company.website && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      <Globe className="mr-1 h-3 w-3" />
                      Website
                    </label>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {company.website}
                    </a>
                  </div>
                )}

                {company.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      <Phone className="mr-1 h-3 w-3" />
                      Phone
                    </label>
                    <p className="text-sm">{company.phone}</p>
                  </div>
                )}

                {company.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      Address
                    </label>
                    <p className="text-sm">{company.address}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">
                    {format(new Date(company.createdAt), 'PPP')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Related Items */}
          <div className="md:col-span-2 space-y-6">
            <Suspense fallback={<div>Loading contacts...</div>}>
              <CompanyContacts companyId={company.id} contacts={company.contacts} />
            </Suspense>

            <Suspense fallback={<div>Loading deals...</div>}>
              <CompanyDeals companyId={company.id} deals={company.deals} />
            </Suspense>

            <Suspense fallback={<div>Loading notes...</div>}>
              <CompanyNotes companyId={company.id} notes={company.notes} />
            </Suspense>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
}