import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error(
      '[Supabase] MISSING ENV VARS at build time.',
      'NEXT_PUBLIC_SUPABASE_URL:', url ? 'SET' : 'UNDEFINED',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'SET' : 'UNDEFINED',
    )
  }

  return createBrowserClient(url!, key!)
}
