// src/store/partsStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Part } from '../services/supabase';

interface PartsState {
  parts: Part[];
  isLoading: boolean;
  error: string | null;
  // This function now takes a search term
  searchParts: (storeId: string, searchTerm: string) => Promise<void>;
}

export const usePartsStore = create<PartsState>((set) => ({
  parts: [],
  isLoading: false,
  error: null,

  searchParts: async (storeId, searchTerm) => {
    try {
      if (!storeId || !searchTerm) {
        set({ parts: [] }); // Clear results if no store or search term
        return;
      }
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('store_location', storeId)
        // This 'or' condition searches both part_number and bin_location
        .or(`part_number.ilike.%${searchTerm}%,bin_location.ilike.%${searchTerm}%`)
        .limit(50); // Limit results to a reasonable number, e.g., 50

      if (error) throw error;

      set({ parts: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));