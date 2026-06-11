import { z } from 'zod'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { analyzeUrl } from '@/lib/web-analyzer'

const Schema = z.object({
  url: z.string().min(3).max(2048),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return badRequest('Campo url requerido')

    const result = await analyzeUrl(parsed.data.url)
    return ok(result)
  } catch (err) {
    return serverError(err)
  }
}
