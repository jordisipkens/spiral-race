import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createToken,
  isAdminRequest,
  sessionCookieOptions
} from '../../../../lib/auth'
import { safeEqual } from '../../../../lib/passwords'

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

    if (typeof password === 'string' && safeEqual(password, adminPassword)) {
      // Signed token, verified by middleware and isAdminRequest()
      const token = await createToken({ role: 'admin' }, ADMIN_SESSION_SECONDS)

      const response = NextResponse.json({ success: true })
      response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(ADMIN_SESSION_SECONDS))
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
  return NextResponse.json({ authenticated: await isAdminRequest(request) })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0))
  return response
}
