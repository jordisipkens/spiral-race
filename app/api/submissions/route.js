import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - Create a new submission
export async function POST(request) {
  try {
    const { team_id, tile_id, image_url } = await request.json()

    if (!team_id || !tile_id || !image_url) {
      return NextResponse.json(
        { error: 'Missing required fields: team_id, tile_id, image_url' },
        { status: 400 }
      )
    }

    // Create submission record
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert({
        team_id,
        tile_id,
        image_url,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, submission: data })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}

// GET - Fetch submissions for a team
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')
    const tile_id = searchParams.get('tile_id')

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('submissions')
      .select('*, tiles(*)')
      .eq('team_id', team_id)
      .order('submitted_at', { ascending: false })

    if (tile_id) {
      query = query.eq('tile_id', tile_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ submissions: data || [] })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
