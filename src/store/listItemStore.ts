// src/store/listItemStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// Define the shape of Part and Equipment objects based on your schema
// This helps with type safety in our components.
export interface Part {
  part_number: string;
  bin_location: string;
  [key: string]: any;
}

export interface Equipment {
  stock_number: string;
  serial_number: string | null;
  customer_number: string | null;
  customer_name: string | null;
  engine_serial_number: string | null;
  invoice_number: string | null;
  make: string | null;
  model: string | null;
  store_location: string | null;
  branch: string | null;
  description: string | null;
  status: string | null;
  model_year: number | null;
  base_code: string | null;
  internal_unit_y_or_n: string | null;
  [key: string]: any;
}

// The ListItem can now contain a nested Part or Equipment object.
export interface ListItem {
  id: number;
  created_at: string;
  list_id: string;
  item_type: 'part' | 'equipment';
  quantity: number;
  notes?: string | null;
  parts: Part | null; // Supabase will populate this if it's a part
  equipment: Equipment | null; // Supabase will populate this if it's equipment
}

interface ListItemState {
  items: ListItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (listId: string) => Promise<void>;
  addItem: (item: any) => Promise<ListItem | null>; // Using `any` for flexibility
  deleteItem: (id: number) => Promise<void>;
}

export const useListItemStore = create<ListItemState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async (listId: string) => {
    set({ isLoading: true, error: null });
    try {
      // This powerful query fetches the list_item and automatically includes
      // the full related row from either the 'parts' or 'equipment' table.
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          *,
          parts ( part_number, bin_location ),
          equipment ( * ) 
        `)
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
        .select(`
          *,
          parts ( part_number, bin_location ),
          equipment ( * )
        `)
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