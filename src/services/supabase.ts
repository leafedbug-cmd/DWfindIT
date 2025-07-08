// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        // allow both normal JSON (arrays) and PostgREST's object media‐type
        Accept: 'application/json, application/vnd.pgrst.object+json',
      },
    },
  }
)

// FIXED: Type definitions that match your ACTUAL database schema
export interface ScanItem {
  id: string
  created_at: string
  updated_at: string | null  // This DOES exist in your table
  barcode: string
  list_id: string
  part_number: string
  bin_location: string
  store_location: string | null  // This DOES exist in your table
  quantity: number
  notes: string | null
}

export interface List {
  id: string
  created_at: string
  name: string
  user_id: string
}

export interface Part {
  part_number: string
  bin_location: string
  store_location: string
  created_at: string
  updated_at: string
  description?: string
}

export type { Database }