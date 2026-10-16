import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { verifyPassword } from '../../../../lib/passwords'
import {
  TEAM_SESSION_SECONDS,
  createToken,
  teamCookieName,
  sessionCookieOptions
} from '../../../../lib/auth'

// POST - Log in to a team page; the session stays valid for a week
export async function POST(request) {
  try {
    const { slug, password } = await request.json()
    if (!slug || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('team_passwords')
      .select('password_hash')
      .eq('team_id', team.id)
      .maybeSingle()

    if (credentialsError) {
      console.error('Error loading team password:', credentialsError)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    if (!credentials) {
      return NextResponse.json(
        { error: 'This team has no password yet. Ask an admin to set one.' },
        { status: 403 }
      )
    }

    if (!(await verifyPassword(password, credentials.password_hash))) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createToken({ role: 'team', teamId: team.id, slug: team.slug }, TEAM_SESSION_SECONDS)
    const response = NextResponse.json({ success: true })
    response.cookies.set(teamCookieName(team.slug), token, sessionCookieOptions(TEAM_SESSION_SECONDS))
    return response
  } catch (error) {
    console.error('Team login failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Log out of a team (?slug=...)
export async function DELETE(request) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set(teamCookieName(slug), '', sessionCookieOptions(0))
  return response
}
