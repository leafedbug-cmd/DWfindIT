// src/pages/HomePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ClipboardList, Package } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />

      <main className="flex-1 p-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm">Store: {selectedStore}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/lists')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <ClipboardList className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">My Lists</span>
              <span className="text-sm text-gray-500 text-center">View & create lists</span>
            </button>

            <button
              onClick={() => navigate('/inventory')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <Package className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Inventory</span>
              <span className="text-sm text-gray-500 text-center">Browse parts</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No recent activity</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};