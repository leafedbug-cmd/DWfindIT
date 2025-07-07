// src/contexts/StoreContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/authStore'

interface StoreContextType {
  selectedStore: string
  setSelectedStore: (store: string) => void
  availableStores: string[]
  isLoading: boolean
}

const StoreContext = createContext<StoreContextType>({
  selectedStore: '03',
  setSelectedStore: () => {},
  availableStores: ['01', '02', '03', '04', '05', '06', '07', '08'],
  isLoading: true,
})

export const useStore = () => useContext(StoreContext)

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState<string>('03')
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()
  const availableStores = ['01', '02', '03', '04', '05', '06', '07', '08']

  useEffect(() => {
    const loadUserStore = async () => {
      if (!user) {
        console.log('No user logged in, skipping store load')
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('store_location')
          .eq('id', user.id)
          .single()

        console.log('⚡️ profile fetch →', { data, error })

        if (error) {
          console.error('❌ Error loading user store:', error)
          setSelectedStore('03') // default on fail
        } else if (data && data.store_location) {
          setSelectedStore(data.store_location)
          console.log('🏷 selectedStore set to →', data.store_location)
        } else {
          console.warn('⚠️ No store_location in profile data, defaulting to 03')
          setSelectedStore('03')
        }
      } catch (err) {
        console.error('❌ Error loading user store:', err)
        setSelectedStore('03')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserStore()
  }, [user])

  const handleSetStore = async (store: string) => {
    setSelectedStore(store)

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ store_location: store })
        .eq('id', user.id)

      if (error) {
        console.error('❌ Error updating store:', error)
      } else {
        console.log('🏷 profile updated to store →', store)
      }
    }
  }

  return (
    <StoreContext.Provider
      value={{
        selectedStore,
        setSelectedStore: handleSetStore,
        availableStores,
        isLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
