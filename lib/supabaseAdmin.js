// Server-side Supabase client with the service role key (never import in client components).
// cache: 'no-store' so Next.js never serves Supabase responses from its fetch cache.
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) } }
)
