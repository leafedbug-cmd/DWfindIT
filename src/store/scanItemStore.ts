// src/store/scanItemStore.ts
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import type { ScanItem } from '../services/supabase'

interface ScanItemState {
  items: ScanItem[]
  recentScan: ScanItem | null
  isLoading: boolean
  error: string | null
  fetchItems: (listId: string) => Promise<void>
  addItem: (item: Omit<ScanItem, 'id' | 'created_at'>) => Promise<ScanItem | null>
  updateItem: (id: string, updates: Partial<ScanItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  clearRecentScan: () => void
}

export const useScanItemStore = create<ScanItemState>((set) => ({
  items: [],
  recentScan: null,
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('scan_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ items: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scan_items')
        .insert(item)
        .select('*')
        .single();
  
      if (error || !data) throw error || new Error('No data returned');
  
      set((state) => ({
        items: [data, ...state.items],
        recentScan: data,
        isLoading: false,
      }));
      // Also update the item count in the listStore for immediate feedback
      // This is an optional but nice UX improvement
      // useListStore.setState(state => ({
      //   lists: state.lists.map(l => l.id === item.list_id ? { ...l, item_count: l.item_count + 1 } : l)
      // }));
      return data;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  updateItem: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('scan_items')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
        isLoading: false,
      }))
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  deleteItem: async (id) => {
    try {
      const { error } = await supabase
        .from('scan_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }));
       // Optional: decrement count in listStore
      // const deletedItem = get().items.find(i => i.id === id);
      // if (deletedItem) {
      //   useListStore.setState(state => ({
      //     lists: state.lists.map(l => l.id === deletedItem.list_id ? { ...l, item_count: l.item_count - 1 } : l)
      //   }));
      // }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  clearRecentScan: () => {
    set({ recentScan: null })
  },
}));