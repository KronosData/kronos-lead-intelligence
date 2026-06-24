import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/session'

// Routes accessible without a session
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout', '/api/health'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    // Redirect already-authenticated users away from /login → /
    if (pathname === '/login') {
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token) {
        const session = await verifySessionToken(token)
        if (session) {
          console.log(`[Proxy] Authenticated user on /login — redirecting to /`)
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  console.log(`[Proxy] path=${pathname} token=${token ? 'present' : 'absent'}`)

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifySessionToken(token)
  console.log(`[Proxy] session=${session ? 'valid' : 'null'}`)

  if (!session) {
    // Expired or tampered cookie
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
