// src/store/listStore.ts
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import type { List } from '../services/supabase'

interface ListState {
  lists: List[]
  currentList: List | null
  isLoading: boolean
  error: string | null
  fetchLists: () => Promise<void>
  createList: (name: string) => Promise<List | null>
  updateList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
  setCurrentList: (list: List | null) => void
}

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  currentList: null,
  isLoading: false,
  error: null,

  fetchLists: async () => {
    try {
      set({ isLoading: true, error: null })

      // only fetch lists for the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error(userError?.message || 'User not authenticated')
      }

      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })

      console.log('Fetched lists →', { data, error })

      if (error) throw error

      set(state => ({
        lists: data,
        currentList: state.currentList || (data && data[0]) || null,
        isLoading: false,
      }))
    } catch (err: any) {
      console.error('❌ fetchLists error:', err)
      set({ error: err.message, isLoading: false })
    }
  },

  createList: async (name: string) => {
    try {
      set({ isLoading: true, error: null })
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('lists')
        .insert([{ name, user_id: userData.user.id }])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        lists: [data, ...state.lists],
        currentList: data,
        isLoading: false,
      }))

      return data
    } catch (error: any) {
      console.error('❌ createList error:', error)
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  updateList: async (id: string, name: string) => {
    try {
      set({ isLoading: true, error: null })
      const { error } = await supabase
        .from('lists')
        .update({ name })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        lists: state.lists.map(list =>
          list.id === id ? { ...list, name } : list
        ),
        currentList:
          state.currentList?.id === id
            ? { ...state.currentList, name }
            : state.currentList,
        isLoading: false,
      }))
    } catch (error: any) {
      console.error('❌ updateList error:', error)
      set({ error: error.message, isLoading: false })
    }
  },

  deleteList: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        lists: state.lists.filter(list => list.id !== id),
        currentList:
          state.currentList?.id === id ? null : state.currentList,
        isLoading: false,
      }))
    } catch (error: any) {
      console.error('❌ deleteList error:', error)
      set({ error: error.message, isLoading: false })
    }
  },

  setCurrentList: (list: List | null) => {
    set({ currentList: list })
  },
}))
