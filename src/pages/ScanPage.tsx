// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore, Part, Equipment } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { Plus, Minus } from 'lucide-react';

// A type to hold either a found Part or Equipment object
type FoundItem = (Part & { item_type: 'part' }) | (Equipment & { item_type: 'equipment' });

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  // --- NEW State Variables ---
  const [manualBarcode, setManualBarcode] = useState('');
  const [foundItem, setFoundItem] = useState<FoundItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  // --- End NEW State ---

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  // --- REFACTORED Logic: A single lookup function for both scan and manual entry ---
  const handleLookup = useCallback(async (barcode: string) => {
    if (!barcode) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setFoundItem(null);
    setQuantity(1);

    try {
      const [partResult, equipmentResult] = await Promise.all([
        supabase
          .from('parts')
          .select('*')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle(),
        supabase
          .from('equipment')
          .select('*')
          .or(`stock_number.eq.${barcode},serial_number.eq.${barcode}`)
          .maybeSingle(),
      ]);

      if (partResult.data) {
        setFoundItem({ ...partResult.data, item_type: 'part' });
        setScanSuccess(`Found Part: ${partResult.data.part_number}`);
      } else if (equipmentResult.data) {
        setFoundItem({ ...equipmentResult.data, item_type: 'equipment' });
        setScanSuccess(`Found Equipment: ${equipmentResult.data.stock_number}`);
      } else {
        throw new Error(`No part or equipment found for "${barcode}" in store ${selectedStore}.`);
      }
    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3500);
    }
  }, [selectedStore]);

  // --- NEW Logic: Function to add the found item to the list ---
  const handleAddItemToList = async () => {
    if (!foundItem || !listId) {
      setScanError("Cannot add item: No item found or no list is active.");
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);

    try {
      let newItemPayload: any;

      if (foundItem.item_type === 'part') {
        newItemPayload = {
          list_id: listId,
          item_type: 'part',
          part_id: foundItem.id,
          quantity: quantity,
        };
      } else { // item_type is 'equipment'
        newItemPayload = {
          list_id: listId,
          item_type: 'equipment',
          equipment_stock_number: foundItem.stock_number,
          quantity: quantity,
        };
      }
      
      const newItem = await addItem(newItemPayload);
      if (!newItem) {
        throw new Error('Failed to save the item to the list.');
      }
      
      setScanSuccess(`Successfully added ${quantity} x ${foundItem.item_type} to list!`);
      // Clear the found item to be ready for the next scan/lookup
      setFoundItem(null);
      setManualBarcode('');

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  };

  const goBackToList = () => {
    if (listId) navigate(`/list/${listId}`);
    else navigate('/lists');
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Add Item to List" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        
        {/* --- NEW: Manual Entry Section --- */}
        <div className="p-4 bg-white rounded-lg shadow-sm border space-y-2">
          <label htmlFor="manual-barcode" className="block text-sm font-medium text-gray-700">
            Manual Entry
          </label>
          <div className="flex space-x-2">
            <input
              id="manual-barcode"
              type="text"
              placeholder="Enter Part # or Stock #"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={() => handleLookup(manualBarcode)}
              disabled={isProcessing || !manualBarcode}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Find
            </button>
          </div>
        </div>

        <BarcodeScanner onScanSuccess={handleLookup} onScanError={setScanError} />

        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* --- NEW: Found Item Details & Actions Section --- */}
        {foundItem && (
          <div className="p-4 bg-white rounded-lg shadow-lg border-2 border-orange-500 space-y-4 animate-fade-in">
            <div>
              <p className="text-sm text-gray-500">{foundItem.item_type === 'part' ? 'Part Found' : 'Equipment Found'}</p>
              <p className="text-lg font-bold text-gray-900">
                {foundItem.item_type === 'part' ? foundItem.part_number : foundItem.stock_number}
              </p>
              <p className="text-sm text-gray-600">
                {foundItem.item_type === 'part' ? foundItem.bin_location : foundItem.serial_number}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 text-center text-xl font-bold p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 flex items-center justify-center text-xl font-bold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Add to List Button */}
            <button
              onClick={handleAddItemToList}
              disabled={isProcessing}
              className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-center font-medium hover:bg-orange-700 disabled:bg-gray-400"
            >
              Add {quantity} to List
            </button>
          </div>
        )}
        
        <button 
          onClick={goBackToList}
          className="w-full mt-4 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium"
        >
          Done Scanning
        </button>
      </main>
      <BottomNav />
    </div>
  );
};