'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  Target,
  CheckSquare,
  Search,
  X,
  DollarSign,
} from 'lucide-react'
import { DealStage } from '@prisma/client'

interface SearchResult {
  companies: Array<{
    id: string
    name: string
    website?: string | null
    phone?: string | null
    _count: {
      contacts: number
      deals: number
    }
  }>
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    title?: string | null
    company?: {
      id: string
      name: string
    } | null
  }>
  deals: Array<{
    id: string
    title: string
    amountCents?: number | null
    stage: DealStage
    company?: {
      id: string
      name: string
    } | null
    contact?: {
      id: string
      firstName: string
      lastName: string
    } | null
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
  }>
}

interface SearchResultsProps {
  query: string
  results: SearchResult
  onClose: () => void
}

const stageColors = {
  [DealStage.LEAD]: 'bg-gray-100 text-gray-800',
  [DealStage.QUALIFIED]: 'bg-blue-100 text-blue-800',
  [DealStage.PROPOSAL]: 'bg-yellow-100 text-yellow-800',
  [DealStage.NEGOTIATION]: 'bg-orange-100 text-orange-800',
  [DealStage.WON]: 'bg-green-100 text-green-800',
  [DealStage.LOST]: 'bg-red-100 text-red-800',
}

export function SearchResults({ query, results, onClose }: SearchResultsProps) {
  const totalResults =
    results.companies.length +
    results.contacts.length +
    results.deals.length +
    results.tasks.length

  if (!query.trim()) {
    return null
  }

  return (
    <Card className="absolute top-full left-0 right-0 z-50 mt-2 shadow-lg max-h-96 overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Search className="mr-2 h-4 w-4" />
            Search Results for "{query}"
            {totalResults > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalResults}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {totalResults === 0 ? (
          <div className="text-center py-8">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No results found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try searching for companies, contacts, deals, or tasks.
            </p>
          </div>
        ) : (
          <>
            {/* Companies */}
            {results.companies.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center mb-3">
                  <Building2 className="mr-2 h-4 w-4" />
                  Companies ({results.companies.length})
                </h4>
                <div className="space-y-2">
                  {results.companies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/companies/${company.id}`}
                      onClick={onClose}
                      className="block p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            {company.website && (
                              <span>{company.website.replace(/^https?:\/\//, '')}</span>
                            )}
                            <span>{company._count.contacts} contacts</span>
                            <span>{company._count.deals} deals</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {results.contacts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center mb-3">
                  <Users className="mr-2 h-4 w-4" />
                  Contacts ({results.contacts.length})
                </h4>
                <div className="space-y-2">
                  {results.contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      onClick={onClose}
                      className="block p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.company && (
                              <span className="flex items-center">
                                <Building2 className="mr-1 h-3 w-3" />
                                {contact.company.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Deals */}
            {results.deals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center mb-3">
                  <Target className="mr-2 h-4 w-4" />
                  Deals ({results.deals.length})
                </h4>
                <div className="space-y-2">
                  {results.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      onClick={onClose}
                      className="block p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                            {deal.amountCents && (
                              <span className="flex items-center">
                                <DollarSign className="mr-1 h-3 w-3" />
                                ${(deal.amountCents / 100).toLocaleString()}
                              </span>
                            )}
                            {deal.company && (
                              <span className="flex items-center">
                                <Building2 className="mr-1 h-3 w-3" />
                                {deal.company.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={stageColors[deal.stage]}>
                          {deal.stage.toLowerCase()}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {results.tasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center mb-3">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tasks ({results.tasks.length})
                </h4>
                <div className="space-y-2">
                  {results.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      onClick={onClose}
                      className="block p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="mt-1 text-sm text-muted-foreground capitalize">
                            Status: {task.status.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}