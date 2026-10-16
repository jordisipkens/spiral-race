import { NextResponse } from 'next/server'
import { isAdminRequest, hasTeamAccess, getTeamSessions } from './lib/auth'

// Gatekeeper for password-protected pages and API routes:
// - /team/[slug]       -> valid team session for that slug (or admin), else redirect to its login page
// - /api/admin/*       -> admin session (except the login endpoint itself)
// - /api/submissions/* -> any team session (or admin); routes check the team_id themselves
export async function middleware(request) {
  const { pathname } = request.nextUrl

  const teamPage = pathname.match(/^\/team\/([^/]+)\/?$/)
  if (teamPage) {
    const slug = decodeURIComponent(teamPage[1])
    if (await hasTeamAccess(request, slug)) return NextResponse.next()

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = `/team/${teamPage[1]}/login`
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/auth')) {
    if (await isAdminRequest(request)) return NextResponse.next()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (pathname.startsWith('/api/submissions')) {
    if (await isAdminRequest(request)) return NextResponse.next()
    if ((await getTeamSessions(request)).length > 0) return NextResponse.next()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/team/:path*', '/api/admin/:path*', '/api/submissions/:path*']
}
