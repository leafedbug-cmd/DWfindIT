// src/store/partsStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Part } from '../services/supabase';

interface PartsState {
  parts: Part[];
  isLoading: boolean;
  error: string | null;
  // Modified to accept a storeId
  fetchParts: (storeId: string) => Promise<void>;
}

export const usePartsStore = create<PartsState>((set) => ({
  parts: [],
  isLoading: false,
  error: null,

  fetchParts: async (storeId: string) => {
    try {
      if (!storeId) {
        // Don't fetch if no store is selected
        set({ parts: [], isLoading: false });
        return;
      }
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        // This is the crucial filter
        .eq('store_location', storeId) 
        .order('part_number', { ascending: true });

      if (error) throw error;

      set({ parts: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));