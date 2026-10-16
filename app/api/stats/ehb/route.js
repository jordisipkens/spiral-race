import { NextResponse } from 'next/server'
import { getCompetitionStats } from '../../../../lib/womStats'

// Always run on request; caching happens in the wom_cache table
export const dynamic = 'force-dynamic'

// GET - EHB stats for the configured WiseOldMan competition (public)
export async function GET() {
  try {
    const stats = await getCompetitionStats({ metric: 'ehb' })
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching EHB stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: error.status || 500 }
    )
  }
}
