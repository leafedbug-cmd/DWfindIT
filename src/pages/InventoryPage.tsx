// src/pages/InventoryPage.tsx
import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useInventoryStore, Part, Equipment } from '../store/inventoryStore'; // UPDATED
import { useStore } from '../contexts/StoreContext';
import { useDebounce } from '../hooks/useDebounce';
import { Search, Hash, Package } from 'lucide-react';

// A dedicated component to render a Part
const PartCard: React.FC<{ part: Part }> = ({ part }) => (
  <>
    <div className="flex-shrink-0 mr-4">
        <Hash className="h-6 w-6 text-gray-400" />
    </div>
    <div>
      <p className="font-semibold text-gray-900">{part.part_number}</p>
      <p className="text-sm text-gray-500">{part.Part_Description || 'No description'}</p>
    </div>
    <div className="text-right ml-auto">
      <p className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{part.bin_location}</p>
    </div>
  </>
);

// A dedicated component to render Equipment
const EquipmentCard: React.FC<{ equipment: Equipment }> = ({ equipment }) => (
  <>
    <div className="flex-shrink-0 mr-4">
      <Package className="h-6 w-6 text-blue-500" />
    </div>
    <div>
      <p className="font-semibold text-gray-900">{equipment.make} {equipment.model}</p>
      <p className="text-sm text-gray-500">{equipment.description || 'No description'}</p>
    </div>
    <div className="text-right ml-auto">
      <p className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{equipment.stock_number}</p>
      <p className="text-xs text-gray-500 mt-1">S/N: {equipment.serial_number || 'N/A'}</p>
    </div>
  </>
);


export const InventoryPage: React.FC = () => {
  // UPDATED: to use the new inventory store
  const { inventory, isLoading, error, searchInventory } = useInventoryStore();
  const { selectedStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm && selectedStore) {
      searchInventory(selectedStore, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, selectedStore, searchInventory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title={`Inventory: ${selectedStore}`} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by part #, bin, stock #, or serial #..." // UPDATED placeholder
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
          {isLoading && <p className="p-4 text-center text-gray-500">Searching...</p>}
          {error && <p className="p-4 text-center text-red-500">Error: {error}</p>}

          {!isLoading && !error && (
            <ul className="divide-y divide-gray-200">
              {inventory.length > 0 ? (
                // UPDATED: Render logic to handle both types
                inventory.map(item => (
                  <li key={`${item.type}-${item.id}`} className="p-4 flex items-center">
                    {item.type === 'part' 
                      ? <PartCard part={item as Part} /> 
                      : <EquipmentCard equipment={item as Equipment} />
                    }
                  </li>
                ))
              ) : (
                <p className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No results found.' : 'Enter a search term to begin.'}
                </p>
              )}
            </ul>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};