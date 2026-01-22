import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const team_id = formData.get('team_id')
    const tile_id = formData.get('tile_id')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!team_id || !tile_id) {
      return NextResponse.json({ error: 'Missing team_id or tile_id' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const filename = `${team_id}/${tile_id}/${Date.now()}.${ext}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('proof-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL (bucket must be public for this to work)
    // If bucket is private, this URL will return 400
    const { data: urlData } = supabaseAdmin.storage
      .from('proof-images')
      .getPublicUrl(filename)

    // Alternative: Use signed URL for private buckets (valid for 1 year)
    // const { data: signedData } = await supabaseAdmin.storage
    //   .from('proof-images')
    //   .createSignedUrl(filename, 60 * 60 * 24 * 365)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      // url: signedData.signedUrl, // Use this for private buckets
      path: data.path
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
