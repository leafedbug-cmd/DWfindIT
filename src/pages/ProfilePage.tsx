// src/pages/ProfilePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../contexts/StoreContext';
import { LogOut, User, MapPin } from 'lucide-react';

// A list of available stores. In a real app, you might fetch this from a 'stores' table.
const availableStores = ["01", "02", "03", "04", "05", "06", "07", "08"];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { selectedStore, setSelectedStore, isLoading: isStoreLoading } = useStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value);
  };

  // This prevents the white screen crash.
  // It shows a loading indicator while the user's profile and store are being fetched.
  if (isStoreLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Profile" />

      <main className="flex-1 p-4 space-y-6">
        {/* User Info Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="bg-orange-100 p-3 rounded-full">
            <User className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Logged in as</p>
            <h2 className="text-lg font-semibold text-gray-900">{user.email}</h2>
          </div>
        </div>

        {/* Store Selector Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <label htmlFor="store-select" className="text-sm text-gray-500">
                Your current store location
              </label>
              <select
                id="store-select"
                value={selectedStore || ''}
                onChange={handleStoreChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-lg rounded-md font-semibold"
              >
                {availableStores.map(store => (
                  <option key={store} value={store}>
                    Store #{store}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </button>
      </main>

      <BottomNav />
    </div>
  );
};