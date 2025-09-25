// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;
    if (!listId) {
      setScanError("No active list. Please go back and select a list first.");
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);

    try {
      // Step 1: Search for the barcode in both tables simultaneously.
      const [partResult, equipmentResult] = await Promise.all([
        supabase
          .from('parts')
          .select('part_number, bin_location')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle(),
        supabase
          .from('equipment')
          .select('stock_number, serial_number')
          .or(`stock_number.eq.${barcode},serial_number.eq.${barcode}`)
          .maybeSingle(),
      ]);
      
      let newItemPayload: any = null;

      // Step 2: Determine what was found and prepare the data for the list.
      if (partResult.data) {
        // We found a part
        newItemPayload = {
          list_id: listId,
          item_type: 'part',
          part_number: partResult.data.part_number,
          bin_location: partResult.data.bin_location,
          quantity: 1,
        };
        setScanSuccess(`Found Part: ${partResult.data.part_number}`);
      } else if (equipmentResult.data) {
        // We found a piece of equipment
        newItemPayload = {
          list_id: listId,
          item_type: 'equipment',
          equipment_stock_number: equipmentResult.data.stock_number,
          quantity: 1,
        };
        setScanSuccess(`Found Equipment: ${equipmentResult.data.stock_number}`);
      } else {
        // Nothing was found
        throw new Error(`No part or equipment found for barcode "${barcode}" in store ${selectedStore}.`);
      }

      // Step 3: Add the found item to the list.
      const newItem = await addItem(newItemPayload);
      if (!newItem) {
        throw new Error('Failed to save the scanned item to the list.');
      }
      
      setScanSuccess(`Successfully added item to list!`);

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3500);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  }, [isProcessing, listId, selectedStore, addItem]);
  
  const goBackToList = () => {
    if (listId) navigate(`/list/${listId}`);
    else navigate('/lists');
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Add Item to List" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />
        {isProcessing && <p className="text-center text-gray-500">Processing...</p>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}
        
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