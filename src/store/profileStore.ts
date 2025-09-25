// src/store/profileStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient'; // FIXED: Corrected the import path

// Define a type for your profile data
interface Profile {
  id: string;
  updated_at: string | null;
  full_name: string | null;
  store_location: string | null;
}

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: true,
  error: null,

  fetchProfile: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      set({ profile: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (userId, updates) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data, isLoading: false });
    } catch (error: any) {
       set({ error: error.message, isLoading: false });
    }
  }
}));