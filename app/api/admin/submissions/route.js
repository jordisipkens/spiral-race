import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check admin auth
function isAuthenticated(request) {
  const token = request.cookies.get('admin_token')
  return !!token
}

// GET - Fetch submissions (for admin review)
export async function GET(request) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    let query = supabaseAdmin
      .from('submissions')
      .select(`
        *,
        teams(id, name, slug),
        tiles(id, title, board, ring, path, points, is_center, is_multi_item, required_submissions)
      `)

    // Handle 'reviewed' as a special case (approved OR rejected)
    if (status === 'reviewed') {
      query = query.in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false })
    } else {
      query = query.eq('status', status)
        .order('submitted_at', { ascending: true })
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

// PATCH - Approve or reject a submission
export async function PATCH(request) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, action, rejection_reason } = await request.json()

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. Provide id and action (approve/reject)' },
        { status: 400 }
      )
    }

    const status = action === 'approve' ? 'approved' : 'rejected'

    // Build update data
    const updateData = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin'
    }

    if (action === 'reject' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    // Update submission
    const { data: submission, error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updateData)
      .eq('id', id)
      .select('*, tiles(*)')
      .single()

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If approved, check if we should add to progress table
    if (action === 'approve') {
      const tile = submission.tiles
      const isMultiItem = tile?.is_multi_item || false
      const requiredSubmissions = tile?.required_submissions || 1

      // Count approved submissions for this team+tile (including the one we just approved)
      const { count, error: countError } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', submission.team_id)
        .eq('tile_id', submission.tile_id)
        .eq('status', 'approved')

      if (countError) {
        console.error('Error counting submissions:', countError)
      }

      const approvedCount = count || 0
      const requiredCount = isMultiItem ? requiredSubmissions : 1
      const progressCreated = approvedCount >= requiredCount

      // Only create progress if we've reached the required number
      if (progressCreated) {
        const { error: progressError } = await supabaseAdmin
          .from('progress')
          .upsert({
            team_id: submission.team_id,
            tile_id: submission.tile_id,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'team_id,tile_id'
          })

        if (progressError) {
          console.error('Error updating progress:', progressError)
          // Rollback submission status
          await supabaseAdmin
            .from('submissions')
            .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
            .eq('id', id)

          return NextResponse.json(
            { error: 'Failed to update progress. Submission rolled back.' },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        submission,
        approvedCount,
        requiredCount,
        progressCreated
      })
    }

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Error processing submission:', error)
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 })
  }
}
