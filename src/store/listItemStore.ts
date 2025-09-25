// src/store/listItemStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
// NOTE: You may need to update your supabase types to include a 'ListItem' interface
// if you have one. For now, we'll use a generic type.
export interface ListItem {
  id: string;
  created_at: string;
  list_id: string;
  part_number?: string | null;
  bin_location?: string | null;
  quantity?: number | null;
  [key: string]: any; // Allow other properties
}

interface ListItemState {
  items: ListItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (listId: string) => Promise<void>;
  addItem: (item: Omit<ListItem, 'id' | 'created_at'>) => Promise<ListItem | null>;
  deleteItem: (id: string) => Promise<void>;
}

export const useListItemStore = create<ListItemState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('list_items') // CORRECTED
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('list_items') // CORRECTED
        .insert(item)
        .select('*')
        .single();

      if (error || !data) throw error || new Error('No data returned');

      set((state) => ({
        items: [data, ...state.items],
        isLoading: false,
      }));
      return data;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },
  
  // Note: updateItem was not in your original file, but can be added if needed.

  deleteItem: async (id: string) => {
    try {
      const { error } = await supabase
        .from('list_items') // CORRECTED
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));