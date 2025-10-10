// src/pages/InventoryPage.tsx
import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useInventoryStore, Part, Equipment } from '../store/inventoryStore';
import { useStore } from '../contexts/StoreContext';
import { useDebounce } from '../hooks/useDebounce';
import { Search, Hash, Package } from 'lucide-react';

// A dedicated component to render a Part
const PartCard: React.FC<{ part: Part; onCopy: (text: string) => void }> = ({ part, onCopy }) => {
  // CHANGED: Create a formatted string with all the part's details.
  const partDetailsToCopy = `Part Info:\nPart #: ${part.part_number}\nDescription: ${part.Part_Description || 'N/A'}\nBin Location: ${part.bin_location}`;

  return (
    <>
      <button onClick={() => onCopy(partDetailsToCopy)} className="flex-shrink-0 mr-4 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:bg-orange-500/20">
        <Hash className="h-6 w-6 text-gray-400 dark:text-gray-300" />
      </button>
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{part.part_number}</p>
        <p className="text-sm text-gray-500 dark:text-gray-300">{part.Part_Description || 'No description'}</p>
      </div>
      <div className="text-right ml-auto">
        <p className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md dark:bg-slate-800 dark:text-gray-100">{part.bin_location}</p>
      </div>
    </>
  );
};

// A dedicated component to render Equipment
const EquipmentCard: React.FC<{ equipment: Equipment; onCopy: (text: string) => void }> = ({ equipment, onCopy }) => {
  // CHANGED: Create a formatted string with all the equipment's details.
  const equipmentDetailsToCopy = `Equipment Info:\nMake: ${equipment.make || 'N/A'}\nModel: ${equipment.model || 'N/A'}\nDescription: ${equipment.description || 'N/A'}\nStock #: ${equipment.stock_number}\nSerial #: ${equipment.serial_number || 'N/A'}`;

  return (
    <>
      <button onClick={() => onCopy(equipmentDetailsToCopy)} className="flex-shrink-0 mr-4 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:bg-blue-500/20">
        <Package className="h-6 w-6 text-blue-500" />
      </button>
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{equipment.make} {equipment.model}</p>
        <p className="text-sm text-gray-500 dark:text-gray-300">{equipment.description || 'No description'}</p>
      </div>
      <div className="text-right ml-auto">
        <p className="font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md dark:bg-slate-800 dark:text-gray-100">{equipment.stock_number}</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-gray-300">S/N: {equipment.serial_number || 'N/A'}</p>
      </div>
    </>
  );
};

export const InventoryPage: React.FC = () => {
  const { inventory, isLoading, error, searchInventory } = useInventoryStore();
  const { selectedStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [copySuccessMessage, setCopySuccessMessage] = useState('');

  useEffect(() => {
    if (debouncedSearchTerm && selectedStore) {
      searchInventory(selectedStore, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, selectedStore, searchInventory]);

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // CHANGED: Cleaner confirmation message
      setCopySuccessMessage('Copied to clipboard!');
      setTimeout(() => setCopySuccessMessage(''), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-16 text-gray-900 dark:text-gray-100">
      <Header title={`Inventory: ${selectedStore}`} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by part #, bin, stock #, or serial #..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-300" />
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
          {isLoading && <p className="p-4 text-center text-gray-500 dark:text-gray-300">Searching...</p>}
          {error && <p className="p-4 text-center text-red-500 dark:text-red-300">Error: {error}</p>}

          {!isLoading && !error && (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {inventory.length > 0 ? (
                inventory.map(item => (
                  <li key={`${item.type}-${item.id}`} className="p-4 flex items-center">
                    {item.type === 'part' 
                      ? <PartCard part={item as Part} onCopy={handleCopyToClipboard} /> 
                      : <EquipmentCard equipment={item as Equipment} onCopy={handleCopyToClipboard} />
                    }
                  </li>
                ))
              ) : (
                <p className="p-4 text-center text-gray-500 dark:text-gray-300">
                  {searchTerm ? 'No results found.' : 'Enter a search term to begin.'}
                </p>
              )}
            </ul>
          )}
        </div>
      </main>

      {/* Toast notification for copy success */}
      {copySuccessMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm dark:bg-slate-200 dark:text-slate-900">
          {copySuccessMessage}
        </div>
      )}

      <BottomNav />
    </div>
  );
};
