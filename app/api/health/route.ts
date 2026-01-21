/**
 * Health Check Endpoint
 *
 * Returns application health status for monitoring and load balancers.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string }
  }
}

export async function GET() {
  const startTime = Date.now()
  const checks: HealthStatus['checks'] = {
    database: { status: 'ok' },
  }

  let overallStatus: HealthStatus['status'] = 'healthy'

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
    overallStatus = 'unhealthy'
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
