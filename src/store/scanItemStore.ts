import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { ScanItem } from '../services/supabase';

interface ScanItemState {
  items: ScanItem[];
  recentScan: ScanItem | null;
  isLoading: boolean;
  error: string | null;
  fetchItems: (listId: string) => Promise<void>;
  addItem: (item: Omit<ScanItem, 'id' | 'created_at'>) => Promise<ScanItem | null>;
  updateItem: (id: string, updates: Partial<ScanItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearRecentScan: () => void;
}

export const useScanItemStore = create<ScanItemState>((set, get) => ({
  items: [],
  recentScan: null,
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('scan_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addItem: async (item) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('scan_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ 
        items: [data, ...state.items],
        recentScan: data,
        isLoading: false 
      }));
      
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateItem: async (id: string, updates: Partial<ScanItem>) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('scan_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      set((state) => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, ...updates } : item
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteItem: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('scan_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set((state) => ({
        items: state.items.filter(item => item.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearRecentScan: () => {
    set({ recentScan: null });
  }
}));