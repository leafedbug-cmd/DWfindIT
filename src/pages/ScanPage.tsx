// src/pages/ScanPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  const { addItem, clearRecentScan, error: itemError, isLoading: isItemLoading } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedPart, setLastScannedPart] = useState<any>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setLastScannedPart(null);
    setLastScannedBarcode(barcode);

    try {
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
      setScanSuccess(`Part Found: ${partData.part_number}`);
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, selectedStore]);

  const handleSaveItem = async (updates: { quantity: number; notes: string }) => {
    if (!lastScannedPart || !currentList || !lastScannedBarcode) {
      setScanError("Cannot save: Missing part, list, or barcode info.");
      return;
    }

    const newItemData = {
      list_id: currentList.id,
      barcode: lastScannedBarcode,
      part_number: lastScannedPart.part_number,
      bin_location: lastScannedPart.bin_location,
      store_location: lastScannedPart.store_location,
      quantity: updates.quantity,
      notes: updates.notes,
    };

    const addedItem = await addItem(newItemData);

    if (addedItem) {
      // --- MODIFIED SUCCESS MESSAGE ---
      setScanSuccess(`Added ${updates.quantity} Parts To List ✅`);
      // --- END MODIFICATION ---

      setLastScannedPart(null);
      setLastScannedBarcode(null);
      clearRecentScan();
      
      // Auto-clear the success message after 3 seconds
      setTimeout(() => {
        setScanSuccess(null);
      }, 3000);
    } 
  };

  const handleCameraError = useCallback((error: string) => {
    setCameraError(error);
  }, []);

  const barcodeScannerComponent = useMemo(() => (
    <BarcodeScanner 
      onScanSuccess={handleScan} 
      onScanError={handleCameraError}
    />
  ), [handleScan, handleCameraError]);
  
  const displayError = scanError || itemError;
  const displayLoading = isProcessing || isItemLoading;

  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists.length, fetchLists]);

  useEffect(() => {
    if (lists.length > 0 && !currentList) {
      setCurrentList(lists[0]);
    }
  }, [lists, currentList, setCurrentList]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan & Add" showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {barcodeScannerComponent}

        <div className="space-y-2">
          {cameraError && <p className="p-3 text-center text-sm bg-yellow-100 text-yellow-800 rounded-lg">Camera Error: {cameraError}</p>}
          {displayError && <p className="p-3 text-center text-sm bg-red-100 text-red-800 rounded-lg">{displayError}</p>}
          {scanSuccess && <p className="p-3 text-center text-sm bg-green-100 text-green-800 rounded-lg">{scanSuccess}</p>}
        </div>
        
        <ScanResult
          item={lastScannedPart}
          isLoading={displayLoading}
          onSave={handleSaveItem}
          onClear={() => {
            setLastScannedPart(null);
            setLastScannedBarcode(null);
            setScanError(null);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};