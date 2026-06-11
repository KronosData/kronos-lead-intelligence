import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export const COOKIE_NAME = 'kronos_session'
const DURATION_SECONDS = 12 * 60 * 60 // 12 hours

export interface SessionPayload extends JWTPayload {
  email: string
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + DURATION_SECONDS)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret())
    return payload
  } catch {
    return null
  }
}
