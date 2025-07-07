// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: true,   // keep tokens fresh
      persistSession: true,     // store session in localStorage
      detectSessionInUrl: true, // handle OAuth redirects
    },
    // IMPORTANT: remove the global Accept header override
    // so PostgREST can negotiate media types:
    // global: {
    //   headers: { Accept: '*/*' }
    // }
  }
)
