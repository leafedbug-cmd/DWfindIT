import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// These will be replaced with actual environment variables when connected to Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Tables = Database['public']['Tables'];
export type ScanItem = Tables['scan_items']['Row'];
export type List = Tables['lists']['Row'];