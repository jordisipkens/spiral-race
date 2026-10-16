import { NextResponse } from 'next/server'
import { isAdminRequest } from '../../../../../lib/auth'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { hashPassword } from '../../../../../lib/passwords'

const MIN_LENGTH = 4

// GET - Team ids that have a password (hashes are never returned)
export async function GET(request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.from('team_passwords').select('team_id')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ teamIds: data.map(row => row.team_id) })
}

// POST - Set or change a team password: { teamId, password }
export async function POST(request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId, password } = await request.json()
  if (!teamId || typeof password !== 'string' || password.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_LENGTH} characters` },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('team_passwords')
    .upsert(
      { team_id: teamId, password_hash: await hashPassword(password), updated_at: new Date().toISOString() },
      { onConflict: 'team_id' }
    )

  if (error) {
    console.error('Error saving team password:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
