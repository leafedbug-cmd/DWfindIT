// src/store/scanItemStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Database } from '../types/supabase';

// Define a type for a single scan item row from our generated types
type ScanItem = Database['public']['Tables']['scan_items']['Row'];
// Define a type for a new item to be inserted, which is more accurate
type NewScanItem = Database['public']['Tables']['scan_items']['Insert'];

interface ScanItemState {
  items: ScanItem[];
  recentScan: ScanItem | null;
  isLoading: boolean;
  error: string | null;
  fetchItems: (listId: string) => Promise<void>;
  addItem: (item: NewScanItem) => Promise<ScanItem | null>;
  updateItem: (id: string, updates: Partial<ScanItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearRecentScan: () => void;
}

export const useScanItemStore = create<ScanItemState>((set) => ({
  items: [],
  recentScan: null,
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scan_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ items: data || [], isLoading: false });
    } catch (err: any) {
      console.error('❌ fetchItems error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      console.log('💾 Inserting scan item:', item);

      const { data, error } = await supabase
        .from('scan_items')
        .insert([item]) // Pass the complete item object directly
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Successfully added item:', data);
      set((state) => ({
        items: [data, ...state.items],
        recentScan: data,
        isLoading: false,
      }));
      return data;
    } catch (err: any) {
      console.error('❌ addItem error:', err);
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  updateItem: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('scan_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      console.error('❌ updateItem error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  deleteItem: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('scan_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }));
    } catch (err: any) {
      console.error('❌ deleteItem error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  clearRecentScan: () => {
    set({ recentScan: null });
  },
}));
