import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildMissingTiles } from '../../../../../lib/tiles'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'proof-images'
const BOARDS = ['easy', 'medium', 'hard']

// Check admin auth
function isAuthenticated(request) {
  const token = request.cookies.get('admin_token')
  return !!token
}

// Extract the storage path from a public URL: .../object/public/proof-images/{path}
function storagePathFromUrl(url) {
  const marker = `/object/public/${BUCKET}/`
  const index = url?.indexOf(marker) ?? -1
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split('?')[0])
}

// POST - Delete all tiles of a board (incl. submissions, progress and screenshots) and regenerate defaults
export async function POST(request) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { board } = await request.json()

    if (!BOARDS.includes(board)) {
      return NextResponse.json({ error: 'Invalid board' }, { status: 400 })
    }

    // Collect screenshot paths before the submissions are removed by the cascade.
    // Paged, because Supabase caps a single select at 1000 rows by default.
    const submissions = []
    const PAGE_SIZE = 1000
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error: fetchError } = await supabaseAdmin
        .from('submissions')
        .select('id, image_url, tiles!inner(board)')
        .eq('tiles.board', board)
        .order('id')
        .range(from, from + PAGE_SIZE - 1)

      if (fetchError) {
        console.error('Error fetching submissions for reset:', fetchError)
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      submissions.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    const imagePaths = [...new Set(submissions.map(s => storagePathFromUrl(s.image_url)).filter(Boolean))]

    // Progress and submissions are removed via ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin
      .from('tiles')
      .delete()
      .eq('board', board)

    if (deleteError) {
      console.error('Error deleting tiles:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const { error: insertError } = await supabaseAdmin
      .from('tiles')
      .insert(buildMissingTiles(board, []))

    if (insertError) {
      console.error('Error regenerating tiles:', insertError)
      return NextResponse.json(
        { error: `${board} tiles deleted, but regenerating failed. Click "Generate" to retry.` },
        { status: 500 }
      )
    }

    // Remove screenshots last: a failure here only leaves orphaned files, never broken data
    let imagesDeleted = 0
    let imagesFailed = 0
    for (let i = 0; i < imagePaths.length; i += 100) {
      const chunk = imagePaths.slice(i, i + 100)
      const { data: removed, error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove(chunk)
      if (storageError) {
        console.error('Error deleting screenshots:', storageError)
        imagesFailed += chunk.length
      } else {
        imagesDeleted += removed.length
      }
    }

    return NextResponse.json({
      success: true,
      submissionsDeleted: submissions.length,
      imagesDeleted,
      imagesFailed
    })
  } catch (error) {
    console.error('Error resetting tiles:', error)
    return NextResponse.json({ error: 'Failed to reset tiles' }, { status: 500 })
  }
}
