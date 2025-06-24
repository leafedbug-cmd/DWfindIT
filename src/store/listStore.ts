import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { List } from '../services/supabase';

interface ListState {
  lists: List[];
  currentList: List | null;
  isLoading: boolean;
  error: string | null;
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<List | null>;
  updateList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  setCurrentList: (list: List | null) => void;
}

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  currentList: null,
  isLoading: false,
  error: null,

  fetchLists: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ lists: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createList: async (name: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('lists')
        .insert([{ name, user_id: userData.user.id }])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ 
        lists: [data, ...state.lists],
        currentList: data,
        isLoading: false 
      }));
      
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateList: async (id: string, name: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('lists')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
      
      set((state) => ({
        lists: state.lists.map(list => 
          list.id === id ? { ...list, name } : list
        ),
        currentList: state.currentList?.id === id 
          ? { ...state.currentList, name } 
          : state.currentList,
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
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
      
      set((state) => ({
        lists: state.lists.filter(list => list.id !== id),
        currentList: state.currentList?.id === id ? null : state.currentList,
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setCurrentList: (list: List | null) => {
    set({ currentList: list });
  }
}));