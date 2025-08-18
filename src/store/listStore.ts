// src/store/listStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';

// We need a new type that includes the item count
export interface ListWithCount {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  scan_items: { count: number }[]; // Supabase returns the count in this shape
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

      set({ lists: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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

      set((state) => ({ lists: [data, ...state.lists] }));
      return data;
    } catch (error: any) {
      set({ error: error.message });
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
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));