import { NextResponse } from 'next/server'
import { isAdminRequest, getTeamSessions } from '../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET - Which sessions this browser has (used by the sidebar to show lock state)
export async function GET(request) {
  const [admin, teams] = await Promise.all([isAdminRequest(request), getTeamSessions(request)])
  return NextResponse.json({ admin, teams: teams.map(team => team.slug) })
}
