// src/store/authStore.ts
import { create } from 'zustand'
// FIXED: Import the client from the new file
import { supabase } from '../services/supabaseClient' 
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password:string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  // initialize default state
  set({ user: null, session: null, isLoading: true, error: null })

  // load existing session on startup
  const initAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    set({
      user: session?.user || null,
      session,
      isLoading: false,
      error: error?.message || null,
    })
  }
  initAuth()

  // subscribe to auth state changes
  supabase.auth.onAuthStateChange(
    (event, session) => {
      set({
        user: session?.user || null,
        session,
      })
    }
  )

  return {
    user: null,
    session: null,
    isLoading: true,
    error: null,

    signIn: async (email, password) => {
      set({ isLoading: true, error: null })
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        set({ error: error.message })
      } else {
        set({ user: data.user, session: data.session })
      }
      set({ isLoading: false })
    },

    signUp: async (email, password) => {
      set({ isLoading: true, error: null })
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        set({ error: error.message })
      } else {
        set({ user: data.user, session: data.session })
      }
      set({ isLoading: false })
    },

    signOut: async () => {
      set({ isLoading: true, error: null })
      const { error } = await supabase.auth.signOut()
      if (error) {
        set({ error: error.message })
      } else {
        set({ user: null, session: null })
      }
      set({ isLoading: false })
    },

    refreshSession: async () => {
      set({ isLoading: true, error: null })
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        set({ error: error.message })
      } else {
        set({ user: session?.user || null, session })
      }
      set({ isLoading: false })
    },
  }
})