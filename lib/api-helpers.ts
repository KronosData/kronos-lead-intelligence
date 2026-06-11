import { ZodError } from 'zod'

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status })
}

export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 })
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

export function notFound(resource = 'Resource'): Response {
  return Response.json({ error: `${resource} not found` }, { status: 404 })
}

export function badRequest(message: string, details?: unknown): Response {
  return Response.json(
    { error: message, ...(details !== undefined && { details }) },
    { status: 400 },
  )
}

export function validationError(err: ZodError): Response {
  return Response.json(
    { error: 'Validation failed', details: err.flatten() },
    { status: 400 },
  )
}

export function serverError(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'Internal server error'
  return Response.json({ error: message }, { status: 500 })
}

export function parseSearchParams(
  url: string,
): Record<string, string> {
  const { searchParams } = new URL(url)
  return Object.fromEntries(searchParams.entries())
}
