// src/store/listItemStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient'; // Corrected import

// Moved from listStore for better organization
export interface ListWithCount {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  item_count: number;
}

export interface ListItem {
  id: number;
  created_at: string;
  list_id: string;
  part_number?: string | null;
  bin_location?: string | null;
  quantity: number;
  notes?: string | null;
}

interface ListItemState {
  items: ListItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (listId: string) => Promise<void>;
  addItem: (item: Omit<ListItem, 'id' | 'created_at'>) => Promise<ListItem | null>;
  deleteItem: (id: number) => Promise<void>;
}

export const useListItemStore = create<ListItemState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('list_items')
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
    try {
      const { data, error } = await supabase
        .from('list_items')
        .insert(item)
        .select('*')
        .single();

      if (error || !data) throw error || new Error('No data returned');

      set((state) => ({ items: [data, ...state.items] }));
      return data;
    } catch (err: any) {
      console.error('Error adding item:', err);
      return null;
    }
  },

  deleteItem: async (id: number) => {
    try {
      const { error } = await supabase.from('list_items').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    } catch (err: any) {
      console.error('Error deleting item:', err);
    }
  },
}));