// src/store/listStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';

// Type representing a list with a normalized count of its items.
export interface ListWithCount {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  // This is the normalized count for easier UI use.
  item_count: number;
}

interface ListState {
  lists: ListWithCount[];
  isLoading: boolean;
  error: string | null;
  currentList: ListWithCount | null;
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<ListWithCount | null>;
  deleteList: (id: string) => Promise<void>;
  setCurrentList: (list: ListWithCount | null) => void;
}

// Helper function to normalize the count from Supabase's response
const getNormalizedItemCount = (list: any): number => {
  if (!list || !list.scan_items) {
    return 0;
  }
  // Supabase returns the count in an array like `[{ "count": 5 }]`
  if (Array.isArray(list.scan_items) && list.scan_items[0] && typeof list.scan_items[0].count === 'number') {
    return list.scan_items[0].count;
  }
  return 0;
};


export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  isLoading: false,
  error: null,
  currentList: null,
  setCurrentList: (list) => set({ currentList: list }),

  fetchLists: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*, scan_items(count)') // Correctly counts related items
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize the data for the UI
      const lists: ListWithCount[] = (data || []).map((list) => ({
        id: list.id,
        created_at: list.created_at,
        name: list.name,
        user_id: list.user_id,
        item_count: getNormalizedItemCount(list),
      }));

      set({
        lists,
        isLoading: false,
        // If no list is currently selected, default to the first one
        currentList: get().currentList || lists[0] || null,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createList: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('lists')
        .insert({ name, user_id: user.id })
        .select() // No need to count on creation, it will be 0
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create list.');

      // Manually shape the new list to match our interface
      const newList: ListWithCount = {
        ...data,
        item_count: 0,
      };

      set((state) => ({
        lists: [newList, ...state.lists],
        isLoading: false,
      }));
      return newList;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  deleteList: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state for a responsive UI
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        // If the deleted list was the current one, clear it
        currentList: state.currentList?.id === id ? null : state.currentList,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));