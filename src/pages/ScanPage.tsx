// src/pages/ScanPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../services/supabase';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore, isLoading: isStoreLoading } = useStore();
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { addItem, clearRecentScan } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view');
  const [lastScannedPart, setLastScannedPart] = useState<any>(null);

  // Load lists on mount
  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists, fetchLists]);

  // Set default list
  useEffect(() => {
    if (lists.length > 0 && !currentList) {
      setCurrentList(lists[0]);
    }
  }, [lists, currentList, setCurrentList]);

  const handleScan = async (barcode: string) => {
    if (isProcessing) return;
    setScanError(null);
    setScanSuccess(null);
    setLastScannedPart(null);

    try {
      setIsProcessing(true);

      // Fetch part from Supabase, using maybeSingle to avoid 406s
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .maybeSingle();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in store ${selectedStore}.`);
      }
      setLastScannedPart(partData);

      // VIEW mode: just show the result
      if (viewMode === 'view') {
        setScanSuccess(`${barcode} → Bin: ${partData.bin_location}`);
        return;
      }

      // ADD mode: insert or update in scan_items
      if (!currentList) {
        throw new Error('No list selected.');
      }

      const { data: existingItem } = await supabase
        .from('scan_items')
        .select('*')
        .eq('barcode', barcode)
        .eq('list_id', currentList.id)
        .maybeSingle();

      if (existingItem) {
        const newQty = existingItem.quantity + 1;
        const { error: updateError } = await supabase
          .from('scan_items')
          .update({ quantity: newQty })
          .eq('id', existingItem.id);
        if (updateError) throw updateError;
        setScanSuccess(`Updated ${barcode} quantity to ${newQty}`);
      } else {
        await addItem({
          barcode,
          part_number: partData.part_number,
          bin_location: partData.bin_location,
          list_id: currentList.id,
          quantity: 1,
          notes: '',
        });
        setScanSuccess(`Added ${barcode} to list`);
      }
    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      // clear notifications after a few seconds
      setTimeout(() => setScanError(null), 3000);
      setTimeout(() => setScanSuccess(null), 3000);
    }
  };

  if (isStoreLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading store settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan Barcode" showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex space-x-4">
          <button
            className={viewMode === 'view' ? 'font-bold text-orange-600' : 'text-gray-600'}
            onClick={() => setViewMode('view')}
          >
            View
          </button>
          <button
            className={viewMode === 'add' ? 'font-bold text-orange-600' : 'text-gray-600'}
            onClick={() => setViewMode('add')}
          >
            Add to List
          </button>
        </div>

        {/* Camera Scanner */}
        <BarcodeScanner onScanSuccess={handleScan} onScanError={(e) => setScanError(e)} />

        {/* Feedback */}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* Scan Result */}
        <ScanResult
          item={lastScannedPart}
          isLoading={isProcessing}
          error={scanError}
          clearResult={clearRecentScan}
          onSave={(updates) => {
            if (lastScannedPart) {
              addItem({ ...lastScannedPart, ...updates });
            }
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};