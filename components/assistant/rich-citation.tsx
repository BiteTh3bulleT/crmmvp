'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  Target,
  FileText,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Citation {
  id: string
  type: string
  title: string
  url: string
  content?: string // Full content for preview
  metadata?: {
    companyName?: string
    contactName?: string
    dealAmount?: number
    status?: string
    createdAt?: string
  }
}

interface RichCitationProps {
  citation: Citation
  showPreview?: boolean
}

const getEntityIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'COMPANY':
      return Building2
    case 'CONTACT':
      return Users
    case 'DEAL':
      return Target
    case 'NOTE':
      return FileText
    default:
      return FileText
  }
}

const getEntityColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'COMPANY':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    case 'CONTACT':
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    case 'DEAL':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
    case 'NOTE':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }
}

export function RichCitation({ citation, showPreview = true }: RichCitationProps) {
  const [showExpanded, setShowExpanded] = useState(false)
  const Icon = getEntityIcon(citation.type)
  const colorClass = getEntityColor(citation.type)

  return (
    <div className="group relative">
      <Link
        href={citation.url}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${colorClass} shadow-sm hover:shadow-md`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate max-w-[200px]">
            {citation.title}
          </div>
          {citation.metadata && (
            <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
              {citation.metadata.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {citation.metadata.companyName}
                </span>
              )}
              {citation.metadata.dealAmount && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  ${citation.metadata.dealAmount.toLocaleString()}
                </Badge>
              )}
              {citation.metadata.status && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {citation.metadata.status}
                </Badge>
              )}
            </div>
          )}
        </div>
        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
      </Link>

      {/* Hover Preview */}
      {showPreview && citation.content && (
        <div className="absolute bottom-full left-0 mb-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <Card className="w-80 shadow-lg border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4" />
                {citation.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 line-clamp-3">
                {citation.content}
              </p>
              <div className="flex items-center justify-between mt-3">
                <Badge className={colorClass}>
                  {citation.type}
                </Badge>
                <Button asChild size="sm" variant="ghost">
                  <Link href={citation.url} className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expanded View Toggle */}
      {citation.content && citation.content.length > 100 && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-1 -right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border shadow-sm"
          onClick={(e) => {
            e.preventDefault()
            setShowExpanded(!showExpanded)
          }}
        >
          {showExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
      )}

      {/* Expanded Content */}
      {showExpanded && citation.content && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {citation.content}
          </p>
          <Button asChild className="mt-2" size="sm">
            <Link href={citation.url}>
              View Full {citation.type}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}