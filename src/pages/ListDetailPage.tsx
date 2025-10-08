// src/pages/ListDetailPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useListItemStore, ListItem, Part, Equipment } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { Trash2, Plus, Package, Hash, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { generateCSV, generatePDF } from '../utils/export';

// --- SearchKeypad Component ---
const SearchKeypad = ({ onSearch, onCancel, isSearching, searchError }: { onSearch: (value: string) => void, onCancel: () => void, isSearching: boolean, searchError: string | null }) => {
    const [inputValue, setInputValue] = useState('');

    const handleButtonClick = (value: string) => {
        if (inputValue.length >= 20) return; // Limit input length
        setInputValue(current => current + value);
    };

    const handleBackspace = () => {
        setInputValue(current => current.slice(0, -1));
    };

    const handleSearch = () => {
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
        }
    };

    const keyLayout = [
        ['1', '2', '3'], 
        ['4', '5', '6'], 
        ['7', '8', '9'],
        ['-', '0', '⌫']
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
                <h3 className="text-lg font-semibold text-center text-gray-800 mb-2">Manual Search & Add</h3>
                <div className="text-right text-3xl font-semibold bg-gray-100 rounded-lg p-3 mb-4 break-all text-gray-900 min-h-[52px]">
                    {inputValue || <span className="text-gray-400">Enter value...</span>}
                </div>
                {searchError && <p className="text-red-500 text-sm text-center mb-2">{searchError}</p>}
                <div className="grid grid-cols-3 gap-3">
                    {keyLayout.flat().map((key, index) => {
                        const action = key === '⌫' ? handleBackspace : () => handleButtonClick(key);
                        return (
                            <button key={index} onClick={action} className="text-2xl h-14 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500">
                                {key}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={onCancel} className="text-lg py-3 font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSearch} disabled={isSearching || !inputValue} className="text-lg py-3 font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400">
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// A component to render a Part
const PartItem: React.FC<{ item: ListItem }> = ({ item }) => (
  <>
    <Hash className="h-8 w-8 text-gray-400 mr-4" />
    <div className="flex-grow">
      <p className="font-semibold text-gray-900">{item.parts?.part_number}</p>
      <p className="text-sm text-gray-500">Bin: {item.parts?.bin_location}</p>
      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
    </div>
  </>
);

// A component to render Equipment
const EquipmentItem: React.FC<{ item: ListItem }> = ({ item }) => (
  <>
    <Package className="h-8 w-8 text-blue-500 mr-4" />
    <div className="flex-grow">
      <p className="font-semibold text-gray-900">
        {item.equipment?.make} {item.equipment?.model}
      </p>
      <p className="text-sm text-gray-500">
        Stock #: {item.equipment?.stock_number} | Serial #: {item.equipment?.serial_number || 'N/A'}
      </p>
      <p className="text-sm text-gray-500">
        Customer: {item.equipment?.customer_name || 'N/A'} ({item.equipment?.customer_number || 'N/A'})
      </p>
    </div>
  </>
);


export const ListDetailPage: React.FC = () => {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { lists } = useListStore();
  const { items, isLoading, error, fetchItems, deleteItem, addItem } = useListItemStore();
  const { selectedStore } = useStore(); // Get selected store for part searching

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const currentList = useMemo(() => lists.find((list) => list.id === listId), [lists, listId]);

  useEffect(() => {
    if (listId) fetchItems(listId);
  }, [listId, fetchItems]);

  const handleDeleteItem = (itemId: number) => {
    deleteItem(itemId);
  };
  
  const handleExportCSV = () => {
    if (!currentList || items.length === 0) return;
    const csvData = generateCSV(currentList, items);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentList.name.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPDF = () => {
    if (!currentList || items.length === 0) return;
    generatePDF(currentList, items);
  };

  const handleManualSearchAndAdd = async (searchValue: string) => {
    if (!searchValue || !listId) return;
    setIsSearching(true);
    setSearchError(null);
    try {
        // First, check for parts in the selected store
        const { data: partData, error: partError } = await supabase
            .from('parts')
            .select('id, part_number')
            .eq('part_number', searchValue)
            .eq('store_location', selectedStore)
            .maybeSingle();

        if (partError) throw partError;

        if (partData) {
            const payload = { list_id: listId, item_type: 'part', part_id: partData.id, quantity: 1 };
            await addItem(payload);
            setAddSuccess(`Added Part: ${partData.part_number}`);
            setIsSearchOpen(false);
            return;
        }

        // If no part, check for equipment by stock or serial number
        const { data: equipData, error: equipError } = await supabase
            .from('equipment')
            .select('stock_number, make, model')
            .or(`stock_number.eq.${searchValue},serial_number.eq.${searchValue}`)
            .maybeSingle();

        if (equipError) throw equipError;

        if (equipData) {
            const payload = { list_id: listId, item_type: 'equipment', equipment_stock_number: equipData.stock_number, quantity: 1 };
            await addItem(payload);
            setAddSuccess(`Added Equip: ${equipData.make} ${equipData.model}`);
            setIsSearchOpen(false);
            return;
        }

        throw new Error(`No item found for "${searchValue}"`);
    } catch (err: any) {
        setSearchError(err.message);
    } finally {
        setIsSearching(false);
        setTimeout(() => setAddSuccess(null), 3000);
    }
  };

  if (!currentList) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p>Loading list...</p>
        <button onClick={() => navigate('/lists')} className="mt-4 text-orange-600">Go Back to Lists</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <Header title={currentList.name} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleExportPDF}
                    disabled={items.length === 0}
                    className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <FileText size={16} />
                    Export PDF
                </button>
                <button
                    onClick={handleExportCSV}
                    disabled={items.length === 0}
                    className="flex items-center justify-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <FileSpreadsheet size={16} />
                    Export CSV
                </button>
            </div>
            <button
                onClick={() => { setSearchError(null); setIsSearchOpen(true); }}
                className="flex items-center justify-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700"
            >
                <Search size={16} />
                Search & Add Item
            </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">Loading items...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">Error: {error}</div>
          ) : items.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="p-4 flex items-center">
                  {item.item_type === 'equipment' && item.equipment ? (
                    <EquipmentItem item={item} />
                  ) : (
                    <PartItem item={item} />
                  )}

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">This list is empty. Add an item to get started.</p>
            </div>
          )}
        </div>
      </main>

      {addSuccess && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg text-sm z-20">
            {addSuccess}
        </div>
      )}

      {isSearchOpen && (
        <SearchKeypad 
            onSearch={handleManualSearchAndAdd}
            onCancel={() => setIsSearchOpen(false)}
            isSearching={isSearching}
            searchError={searchError}
        />
      )}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t">
        <button
            onClick={() => navigate(`/scan?list=${listId}`)}
            className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-center font-medium"
        >
            <Plus className="h-5 w-5 mr-2" />
            Add Item via Scan
        </button>
      </div>

      <BottomNav />
    </div>
  );
};