// src/store/inventoryStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// Define the types for our search results
// We add a 'type' property to distinguish them in the UI
export interface Part {
  id: string;
  type: 'part';
  part_number: string;
  Part_Description: string | null;
  bin_location: string;
  store_location: string | null;
}

export interface Equipment {
  id: string;
  type: 'equipment';
  stock_number: string;
  serial_number: string | null;
  make: string | null;
  model: string | null;
  description: string | null;
  customer_number: string | null;
  customer_name: string | null;
  store_location: string | null;
}

export type InventoryItem = Part | Equipment;

interface InventoryState {
  inventory: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  searchInventory: (storeId: string, searchTerm: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  inventory: [],
  isLoading: false,
  error: null,

  searchInventory: async (storeId, searchTerm) => {
    try {
      if (!storeId || !searchTerm) {
        set({ inventory: [] });
        return;
      }
      set({ isLoading: true, error: null });

      // Perform searches for parts and equipment in parallel
      const [partsResponse, equipmentResponse] = await Promise.all([
        // Parts query STILL filters by store location
        supabase
          .from('parts')
          .select('id, part_number, Part_Description, bin_location, store_location')
          .eq('store_location', storeId)
          .or(`part_number.ilike.%${searchTerm}%,bin_location.ilike.%${searchTerm}%,Part_Description.ilike.%${searchTerm}%`)
          .limit(25),
        
        // Equipment query NO LONGER filters by store location
        supabase
          .from('equipment')
          .select('id, stock_number, serial_number, make, model, description, customer_number, customer_name, store_location')
          // REMOVED: .eq('store_location', storeId) to allow global search
          .or(`stock_number.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,customer_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(25),
      ]);

      if (partsResponse.error) throw partsResponse.error;
      if (equipmentResponse.error) throw equipmentResponse.error;

      // Add a 'type' property to each result so we can tell them apart in the UI
      const parts: Part[] = (partsResponse.data || []).map(p => ({ ...p, type: 'part' }));
      const equipment: Equipment[] = (equipmentResponse.data || []).map(e => ({ ...e, type: 'equipment' }));
      
      // Combine the results
      const combinedResults = [...parts, ...equipment];

      set({ inventory: combinedResults, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
