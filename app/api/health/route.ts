// GET /api/health
// Public, read-only keep-alive endpoint. Pinged on a schedule by .github/workflows/keep-db-alive.yml
// so Supabase never flags this project as inactive and pauses/deletes it.

import { prisma } from '@/lib/db'
import { ok, serverError } from '@/lib/api-helpers'

export async function GET(): Promise<Response> {
  try {
    const companies = await prisma.company.count()
    return ok({ status: 'ok', companies, checkedAt: new Date().toISOString() })
  } catch (err) {
    return serverError(err)
  }
}
