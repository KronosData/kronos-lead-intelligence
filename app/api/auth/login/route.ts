import { NextResponse } from 'next/server'
import { scrypt, timingSafeEqual } from 'node:crypto'
import { createSessionToken, COOKIE_NAME } from '@/lib/session'
import { checkRateLimit, recordFailure, recordSuccess } from '@/lib/rate-limit'

// ── Helpers ────────────────────────────────────────────────────────────────

function denied(): NextResponse {
  return NextResponse.json({ error: 'Access denied' }, { status: 401 })
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  // fetch() from the same page always sends Origin; reject if missing in production
  if (!origin) return process.env.NODE_ENV !== 'production'
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

async function verifyHash(password: string, storedHash: string): Promise<boolean> {
  // Expected format: scrypt:<N>:<r>:<p>:<salt_hex>:<hash_hex>
  const parts = storedHash.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, N, r, p, saltHex, hashHex] = parts
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')

    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, expected.length, { N: +N, r: +r, p: +p, maxmem: 128 * 1024 * 1024 }, (err, key) => {
        if (err) reject(err)
        else resolve(key)
      })
    })

    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Origin validation — rejects requests from external origins
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse body
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return denied()
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) return denied()

  const ip = getClientIp(request)

  // 3. Rate limit check (before any validation to prevent enumeration via timing)
  if (checkRateLimit(ip, email)) {
    console.log(`[Auth] Rate-limited | ${new Date().toISOString()} | ip: ${ip.replace(/\.\d+$/, '.xxx')}`)
    return denied()
  }

  // 4. Validate email and password — both checks run before failing (timing consistency)
  const authorized = (process.env.AUTHORIZED_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

  const storedHash = process.env.INTERNAL_ACCESS_PASSWORD_HASH ?? ''

  const emailOk = authorized.includes(email)
  // Always run hash comparison even if email is wrong (prevents timing oracle)
  const passwordOk = storedHash ? await verifyHash(password, storedHash) : false

  if (!emailOk || !passwordOk) {
    recordFailure(ip, email)
    return denied()
  }

  // 5. Create signed session
  let token: string
  try {
    token = await createSessionToken(email)
  } catch (err) {
    console.error('[Auth] Session error:', (err as Error).message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  recordSuccess(ip, email)

  const isProd = process.env.NODE_ENV === 'production'
  console.log(`[Auth] Login success | ${new Date().toISOString()} | emailOk=${emailOk} passwordOk=${passwordOk}`)
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60,
  })
  return response
}
