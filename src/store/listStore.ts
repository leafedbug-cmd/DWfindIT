// src/store/listStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';

// Type representing a list with an optional count of related scan items.
// `scan_items` comes directly from Supabase and its shape may vary depending on
// the query. We therefore normalise the count into `item_count` for easier use
// within the UI.
export interface ListWithCount {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  // Raw `scan_items` relation from Supabase; structure can be an array of
  // items or an array/object containing a `count` property.
  scan_items: unknown;
  // Normalised count of related items.
  item_count: number;
}

interface ListState {
  lists: ListWithCount[]; // Use the new type
  isLoading: boolean;
  error: string | null;
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<ListWithCount | null>;
  deleteList: (id: string) => Promise<void>;
}

export const useListStore = create<ListState>((set) => ({
  lists: [],
  isLoading: false,
  error: null,

  fetchLists: async () => {
    try {
      set({ isLoading: true, error: null });

      // --- MODIFIED QUERY TO COUNT ITEMS ---
      const { data, error } = await supabase
        .from('lists')
        // 'scan_items(count)' tells Supabase to count related items
        .select('*, scan_items(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const lists = (data || []).map((list) => {
        const scanItems = (list as { scan_items: unknown }).scan_items;
        const item_count = Array.isArray(scanItems)
          ? (typeof (scanItems[0] as { count?: number })?.count === 'number'
              ? (scanItems[0] as { count?: number }).count!
              : scanItems.length)
          : (typeof (scanItems as { count?: number } | undefined)?.count === 'number'
              ? (scanItems as { count: number }).count
              : 0);
        return { ...list, item_count } as ListWithCount;
      });

      set({ lists, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },

  createList: async (name: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('lists')
        .insert([{ name, user_id: userData.user.id }])
        .select('*, scan_items(count)') // Also count items on creation
        .single();

      if (error) throw error;

      const scanItems = (data as { scan_items: unknown }).scan_items;
      const item_count = Array.isArray(scanItems)
        ? (typeof (scanItems[0] as { count?: number })?.count === 'number'
            ? (scanItems[0] as { count?: number }).count!
            : scanItems.length)
        : (typeof (scanItems as { count?: number } | undefined)?.count === 'number'
            ? (scanItems as { count: number }).count
            : 0);

      const newList: ListWithCount = { ...(data as object), scan_items: scanItems, item_count } as ListWithCount;

      set((state) => ({ lists: [newList, ...state.lists] }));
      return newList;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return null;
    }
  },

  deleteList: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update the local state immediately for a fast UI response
      set((state) => ({
        lists: state.lists.filter(list => list.id !== id),
        isLoading: false
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
    }
  },
}));
