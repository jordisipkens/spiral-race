import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { password } = await request.json()

    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    if (password === adminPassword) {
      // Create a simple token (in production, use JWT or similar)
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64')

      const response = NextResponse.json({ success: true })

      // Set HTTP-only cookie for security
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      })

      return response
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  const token = request.cookies.get('admin_token')

  if (token) {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })

  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0
  })

  return response
}
