// src/store/listStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export type ShareRole = 'viewer' | 'editor';

export type ListWithCount = {
  id: string;
  created_at: string;
  name: string;
  user_id: string;
  item_count: number;
  shared?: boolean;
  sharedRole?: ShareRole;
  sharedBy?: string | null;
};

export interface ListShare {
  id: string;
  list_id: string;
  created_at: string;
  shared_by: string;
  shared_with: string;
  role: ShareRole;
}

interface ListState {
  lists: ListWithCount[];
  isLoading: boolean;
  error: string | null;
  currentList: ListWithCount | null;
  sharesByList: Record<string, ListShare[]>;
  fetchLists: () => Promise<void>;
  createList: (name: string) => Promise<ListWithCount | null>;
  deleteList: (id: string) => Promise<void>;
  setCurrentList: (list: ListWithCount | null) => void;
  fetchShares: (listId: string) => Promise<ListShare[]>;
  shareList: (listId: string, sharedWith: string, role?: ShareRole) => Promise<ListShare | null>;
  revokeShare: (shareId: string) => Promise<void>;
}

// Helper to normalize the aggregated count from Supabase responses.
const getNormalizedItemCount = (list: any): number => {
  if (!list || !list.list_items) return 0;
  if (Array.isArray(list.list_items) && list.list_items[0] && typeof list.list_items[0].count === 'number') {
    return list.list_items[0].count;
  }
  return 0;
};

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  isLoading: false,
  error: null,
  currentList: null,
  sharesByList: {},

  setCurrentList: (list) => set({ currentList: list }),

  fetchLists: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData?.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('lists')
        .select(`
          id,
          created_at,
          name,
          user_id,
          list_items(count),
          list_shares!left(
            id,
            shared_with,
            shared_by,
            role
          )
        `)
        .or(`user_id.eq.${user.id},list_shares.shared_with.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listMap = new Map<string, ListWithCount>();
      (data || []).forEach((list: any) => {
        const shareRecords = Array.isArray(list.list_shares) ? list.list_shares : [];
        const recipientShare = shareRecords.find((share: any) => share.shared_with === user.id);
        const isOwner = list.user_id === user.id;

        listMap.set(list.id, {
          id: list.id,
          created_at: list.created_at,
          name: list.name,
          user_id: list.user_id,
          item_count: getNormalizedItemCount(list),
          shared: !isOwner && !!recipientShare,
          sharedRole: recipientShare?.role,
          sharedBy: recipientShare?.shared_by ?? list.user_id ?? null,
        });
      });

      set({ lists: Array.from(listMap.values()), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createList: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData?.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('lists')
        .insert({ name, user_id: user.id })
        .select(`
          id,
          created_at,
          name,
          user_id
        `)
        .single();

      if (error || !data) throw error || new Error('Failed to create list.');

      const newList: ListWithCount = { ...data, item_count: 0, shared: false };

      set((state) => ({ lists: [newList, ...state.lists], isLoading: false }));
      return newList;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  deleteList: async (id: string) => {
    try {
      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        currentList: state.currentList?.id === id ? null : state.currentList,
        sharesByList: Object.fromEntries(
          Object.entries(state.sharesByList).filter(([key]) => key !== id)
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchShares: async (listId: string) => {
    try {
      const { data, error } = await supabase
        .from('list_shares')
        .select('id, list_id, created_at, shared_by, shared_with, role')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shares = data || [];
      set((state) => ({
        sharesByList: {
          ...state.sharesByList,
          [listId]: shares,
        },
      }));
      return shares;
    } catch (error: any) {
      set({ error: error.message });
      return [];
    }
  },

  shareList: async (listId: string, sharedWith: string, role: ShareRole = 'viewer') => {
    try {
      const { data, error } = await supabase
        .from('list_shares')
        .insert({ list_id: listId, shared_with: sharedWith, role })
        .select('id, list_id, created_at, shared_by, shared_with, role')
        .single();

      if (error || !data) throw error || new Error('Failed to share list.');

      set((state) => {
        const existing = state.sharesByList[listId] || [];
        return {
          sharesByList: {
            ...state.sharesByList,
            [listId]: [data, ...existing.filter((share) => share.shared_with !== data.shared_with)],
          },
        };
      });

      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  revokeShare: async (shareId: string) => {
    try {
      const { data, error } = await supabase
        .from('list_shares')
        .delete()
        .eq('id', shareId)
        .select('id, list_id')
        .single();

      if (error) throw error;

      const listId = data?.list_id;
      if (!listId) return;

      set((state) => {
        const existing = state.sharesByList[listId] || [];
        return {
          sharesByList: {
            ...state.sharesByList,
            [listId]: existing.filter((share) => share.id !== shareId),
          },
        };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
