// src/store/workOrderStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// UPDATED: The type now includes all fields needed for the form and PDF
export interface WorkOrderWithEquipment {
  id: number;
  created_at: string;
  status: string | null;
  description: string | null;
  customer_number: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  job_location: string | null;
  instructions: string | null;
  equipment: {
    stock_number: string;
    serial_number: string | null;
    make: string | null;
    model: string | null;
    hour_meter: string | null; // or whatever the column name is
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
      // UPDATED: The query now fetches all the necessary fields.
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          equipment:equipment_stock_number ( * )
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

