// src/store/workOrderStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// Define the shape of a work order with its related equipment
export interface WorkOrderWithEquipment {
  id: number;
  created_at: string;
  status: string | null;
  description: string | null;
  customer_number: string | null;
  equipment: {
    stock_number: string;
    make: string | null;
    model: string | null;
  } | null;
}

interface WorkOrderState {
  workOrders: WorkOrderWithEquipment[];
  isLoading: boolean;
  error: string | null;
  fetchWorkOrders: (userId: string) => Promise<void>;
}

export const useWorkOrderStore = create<WorkOrderState>((set) => ({
  workOrders: [],
  isLoading: false,
  error: null,

  fetchWorkOrders: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // This query fetches all work orders for the user and joins the related equipment data
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          created_at,
          status,
          description,
          customer_number,
          equipment:equipment_stock_number (
            stock_number,
            make,
            model
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      set({ workOrders: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
