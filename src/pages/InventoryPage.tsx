// src/pages/InventoryPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { usePartsStore } from '../store/partsStore';
import { useStore } from '../contexts/StoreContext'; // For getting the selected store
import { Search } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { parts, isLoading, error, fetchParts } = usePartsStore();
  const { selectedStore, isLoading: isStoreLoading } = useStore(); // Get the selected store
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch parts for the selected store when it's available
    if (selectedStore) {
      fetchParts(selectedStore);
    }
  }, [fetchParts, selectedStore]); // Re-fetch if the store changes

  const filteredParts = useMemo(() => {
    if (!searchTerm) {
      return parts;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // This filter is now "null-safe"
    return parts.filter(part =>
      (part.part_number?.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (part.bin_location?.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [parts, searchTerm]);

  if (isStoreLoading) {
    return <div className="p-4 text-center">Loading user settings...</div>;
  }

  if (!selectedStore && !isStoreLoading) {
    return <div className="p-4 text-center">No store selected. Please select a store from your profile.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title={`Inventory: ${selectedStore}`} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by part # or bin..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading && <p className="p-4 text-center text-gray-500">Loading parts for store {selectedStore}...</p>}
          {error && <p className="p-4 text-center text-red-500">Error: {error}</p>}

          {!isLoading && !error && (
            <ul className="divide-y divide-gray-200">
              {filteredParts.length > 0 ? (
                filteredParts.map(part => (
                  <li key={part.part_number} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{part.part_number}</p>
                      <p className="text-sm text-gray-500">{part.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{part.bin_location}</p>
                    </div>
                  </li>
                ))
              ) : (
                <p className="p-4 text-center text-gray-500">No parts found matching your search.</p>
              )}
            </ul>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};