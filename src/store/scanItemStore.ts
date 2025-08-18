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

export const useScanItemStore = create<ScanItemState>((set, get) => ({
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

      console.log('⚡️ fetchItems →', { listId, data, error })

      if (error) throw error
      set({ items: data || [], isLoading: false })
    } catch (err: any) {
      console.error('❌ fetchItems error:', err)
      set({ error: err.message, isLoading: false })
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null })
    try {
      // FIXED: Include ALL columns that exist in your scan_items table
      const scanItemData = {
        barcode: item.barcode,
        list_id: item.list_id,
        part_number: item.part_number,
        bin_location: item.bin_location,
        store_location: item.store_location || null,  // Include this since it exists
        quantity: item.quantity,
        notes: item.notes || ''
        // Let database handle: id (auto-generated), created_at (auto), updated_at (auto)
      }

      console.log('💾 Inserting scan item:', scanItemData)

      const { data, error } = await supabase
        .from('scan_items')
        .insert([scanItemData])
        .select('*') // Select all columns including updated_at and store_location
        .single()

      console.log('⚡️ addItem →', { item: scanItemData, data, error })

      if (error || !data) throw error || new Error('No data returned')
      set((state) => ({
        items: [data, ...state.items],
        recentScan: data,
        isLoading: false,
      }))
      return data
    } catch (err: any) {
      console.error('❌ addItem error:', err)
      set({ error: err.message, isLoading: false })
      return null
    }
  },

  updateItem: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      // FIXED: Include all updatable fields that exist in your table
      const allowedUpdates: Partial<ScanItem> = {}
      
      // Include all fields that exist in your database table
      if ('quantity' in updates) allowedUpdates.quantity = updates.quantity
      if ('notes' in updates) allowedUpdates.notes = updates.notes
      if ('barcode' in updates) allowedUpdates.barcode = updates.barcode
      if ('part_number' in updates) allowedUpdates.part_number = updates.part_number
      if ('bin_location' in updates) allowedUpdates.bin_location = updates.bin_location
      if ('store_location' in updates) allowedUpdates.store_location = updates.store_location

      console.log('📝 Updating scan item:', { id, updates: allowedUpdates })

      const { error } = await supabase
        .from('scan_items')
        .update(allowedUpdates)
        .eq('id', id)

      console.log('⚡️ updateItem →', { id, updates: allowedUpdates, error })

      if (error) throw error
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...allowedUpdates } : item
        ),
        isLoading: false,
      }))
    } catch (err: any) {
      console.error('❌ updateItem error:', err)
      set({ error: err.message, isLoading: false })
    }
  },

  deleteItem: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('scan_items')
        .delete()
        .eq('id', id)

      console.log('⚡️ deleteItem →', { id, error })

      if (error) throw error
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }))
    } catch (err: any) {
      console.error('❌ deleteItem error:', err)
      set({ error: err.message, isLoading: false })
    }
  },

  clearRecentScan: () => {
    console.log('⚡️ clearRecentScan')
    set({ recentScan: null })
  },
}))