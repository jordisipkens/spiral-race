import { NextResponse } from 'next/server'
import { getWomTileProgress } from '../../../lib/womTiles'

// Always run on request; caching happens in the tile_wom_progress table
export const dynamic = 'force-dynamic'

// GET ?team=<team id> - cached WiseOldMan progress for the team's WOM-linked tiles (public, like /api/stats)
export async function GET(request) {
  const teamId = new URL(request.url).searchParams.get('team')
  if (!teamId) {
    return NextResponse.json({ error: 'Missing team' }, { status: 400 })
  }

  try {
    const tiles = await getWomTileProgress(teamId)
    return NextResponse.json({ tiles })
  } catch (error) {
    console.error('Error fetching WOM tile progress:', error)
    return NextResponse.json({ error: 'Failed to fetch WOM tile progress' }, { status: 500 })
  }
}
