import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createSessionToken, COOKIE_NAME } from '@/lib/session'

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  const len = Math.max(aBuf.length, bBuf.length)
  const aPad = Buffer.alloc(len)
  const bPad = Buffer.alloc(len)
  aBuf.copy(aPad)
  bBuf.copy(bPad)
  return timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Access denied' }, { status: 401 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Access denied' }, { status: 401 })
  }

  // Validate authorized emails (server-side only)
  const authorized = (process.env.AUTHORIZED_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (!authorized.includes(email.toLowerCase())) {
    return NextResponse.json({ error: 'Access denied' }, { status: 401 })
  }

  // Timing-safe password comparison
  const storedPassword = process.env.INTERNAL_ACCESS_PASSWORD ?? ''
  if (!storedPassword || !constantTimeEqual(password, storedPassword)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 401 })
  }

  // Create signed JWT session — does NOT contain the password
  let token: string
  try {
    token = await createSessionToken(email.toLowerCase())
  } catch (err) {
    console.error('[Auth] Session creation failed:', (err as Error).message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60,
  })
  return response
}
