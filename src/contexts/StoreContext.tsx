// src/contexts/StoreContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';

interface StoreContextType {
  selectedStore: string | null;
  setSelectedStore: (store: string) => Promise<boolean>;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStore, _setSelectedStore] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { profile, fetchProfile, updateProfile, isLoading: isProfileLoading } = useProfileStore();

  // Fetch the user's profile when they log in
  useEffect(() => {
    if (user && !profile) {
      fetchProfile(user.id);
    }
  }, [user, profile, fetchProfile]);

  // Set the selected store from the user's profile once it's loaded
  useEffect(() => {
    if (profile?.store_location) {
      _setSelectedStore(profile.store_location);
    }
  }, [profile]);

  // Function to update the store both locally and in the database
  const setSelectedStore = async (store: string) => {
    if (!user) {
      return false;
    }

    const trimmedStore = store.trim();
    const previousStore = profile?.store_location ?? null;

    const normalizedStore = trimmedStore.length > 0 ? trimmedStore : null;
    if (normalizedStore === previousStore) {
      _setSelectedStore(previousStore);
      return true;
    }

    _setSelectedStore(normalizedStore);

    const didUpdate = await updateProfile(user.id, { store_location: normalizedStore });
    if (!didUpdate) {
      _setSelectedStore(previousStore);
    }

    return didUpdate;
  };

  return (
    <StoreContext.Provider value={{ selectedStore, setSelectedStore, isLoading: isProfileLoading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
