// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore } from '../store/listItemStore';
import { supabase } from '../services/supabase';
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
    if (isProcessing || !listId) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);

    try {
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('part_number, bin_location')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .maybeSingle();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in store ${selectedStore}.`);
      }

      const newItem = await addItem({
        list_id: listId,
        part_number: partData.part_number,
        bin_location: partData.bin_location,
        quantity: 1,
      });

      if (newItem) {
        setScanSuccess(`Added ${newItem.part_number} to list!`);
      } else {
        throw new Error('Failed to save item.');
      }

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3000);
      setTimeout(() => setScanSuccess(null), 3000);
    }
  }, [isProcessing, listId, selectedStore, addItem]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Add Item to List" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />
        {isProcessing && <p className="text-center text-gray-500">Processing...</p>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}
      </main>
      <BottomNav />
    </div>
  );
};