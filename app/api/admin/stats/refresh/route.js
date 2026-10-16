import { NextResponse } from 'next/server'
import { isAdminRequest } from '../../../../../lib/auth'
import { getCompetitionStats } from '../../../../../lib/womStats'

// POST - Force a refresh of the WiseOldMan cache (bypasses the TTL)
export async function POST(request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getCompetitionStats({ force: true })
    if (stats.stale) {
      return NextResponse.json(
        { error: 'WiseOldMan could not be reached, showing cached data', ...stats },
        { status: 502 }
      )
    }
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error refreshing stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh stats' },
      { status: error.status || 500 }
    )
  }
}
