// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'  // adjust path if you moved the types

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
      autoRefreshToken:   true,  // refresh tokens automatically
      persistSession:     true,  // store session in localStorage
      detectSessionInUrl: true,  // pick up OAuth tokens from URL
    },
    global: {
      headers: {
        Accept: 'application/json',  // ensure PostgREST returns JSON
      },
    },
  }
)

// Optional type helpers:
export type Tables   = Database['public']['Tables']
export type ScanItem = Tables['scan_items']['Row']
export type List     = Tables['lists']['Row']
