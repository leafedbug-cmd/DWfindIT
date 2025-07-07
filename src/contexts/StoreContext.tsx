import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

interface StoreContextType {
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  availableStores: string[];
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType>({
  selectedStore: '03',
  setSelectedStore: () => {},
  availableStores: ['01', '02', '03', '04', '05', '06', '07', '08'],
  isLoading: true
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState<string>('03');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const availableStores = ['01', '02', '03', '04', '05', '06', '07', '08'];

  useEffect(() => {
    const loadUserStore = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('store_location')
          .eq('id', user.id)
          .single();

        if (data && data.store_location) {
          setSelectedStore(data.store_location);
          console.log('User store loaded:', data.store_location);
        }
      } catch (error) {
        console.error('Error loading user store:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStore();
  }, [user]);

  const handleSetStore = async (store: string) => {
    setSelectedStore(store);
    
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ store_location: store })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating store:', error);
      }
    }
  };

  return (
    <StoreContext.Provider value={{
      selectedStore,
      setSelectedStore: handleSetStore,
      availableStores,
      isLoading
    }}>
      {children}
    </StoreContext.Provider>
  );
};