import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}
