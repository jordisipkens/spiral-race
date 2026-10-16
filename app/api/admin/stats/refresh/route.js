import { NextResponse } from 'next/server'
import { getCompetitionStats } from '../../../../../lib/womStats'

// Check admin auth
function isAuthenticated(request) {
  const token = request.cookies.get('admin_token')
  return !!token
}

// POST - Force a refresh of the WiseOldMan cache (bypasses the TTL)
export async function POST(request) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getCompetitionStats({ metric: 'ehb', force: true })
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
