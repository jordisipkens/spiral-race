// Signed session tokens (HMAC-SHA256 via Web Crypto), usable in middleware (Edge) and API routes.
// Token format: base64url(JSON payload) + '.' + base64url(signature)

export const ADMIN_COOKIE = 'admin_token'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 // 24 hours
export const TEAM_SESSION_SECONDS = 60 * 60 * 24 * 7 // 1 week

// One cookie per team, so a browser can be logged in to several teams (e.g. admins testing)
export const teamCookieName = slug => `team_${slug}`

const encoder = new TextEncoder()

function getSecret() {
  // AUTH_SECRET is preferred; falls back to ADMIN_PASSWORD so no extra env var is required.
  // Changing the secret logs everyone out.
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || null
}

function toBase64Url(bytes) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createToken(payload, maxAgeSeconds) {
  const secret = getSecret()
  if (!secret) throw new Error('AUTH_SECRET or ADMIN_PASSWORD must be set')

  const body = toBase64Url(encoder.encode(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  })))
  const signature = await crypto.subtle.sign('HMAC', await getKey(secret), encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

// Returns the payload when the token is valid and not expired, otherwise null
export async function verifyToken(token) {
  const secret = getSecret()
  if (!secret || !token || typeof token !== 'string') return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(secret),
      fromBase64Url(signature),
      encoder.encode(body)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function isAdminRequest(request) {
  const payload = await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value)
  return payload?.role === 'admin'
}

// Valid team session for this slug (admins have access to every team)
export async function hasTeamAccess(request, slug) {
  if (await isAdminRequest(request)) return true
  const payload = await verifyToken(request.cookies.get(teamCookieName(slug))?.value)
  return payload?.role === 'team' && payload.slug === slug
}

// All team ids this request has a valid team session for
export async function getTeamSessions(request) {
  const sessions = []
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('team_')) continue
    const payload = await verifyToken(cookie.value)
    if (payload?.role === 'team' && teamCookieName(payload.slug) === cookie.name) {
      sessions.push({ teamId: payload.teamId, slug: payload.slug })
    }
  }
  return sessions
}

export function sessionCookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds
  }
}

// Admin, or a valid team session for this team id
export async function canActForTeam(request, teamId) {
  if (await isAdminRequest(request)) return true
  const sessions = await getTeamSessions(request)
  return sessions.some(session => session.teamId === teamId)
}
