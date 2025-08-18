// src/pages/ScanPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../services/supabase';

// A unified type to handle results from either table
export interface UnifiedScanResult {
  type: 'part' | 'equipment';
  id: string; // Will be part.id or equipment.stock_number
  primaryIdentifier: string; // Will hold part_number or stock_number
  secondaryIdentifier: string; // Will hold bin_location or make/model
  barcode: string;
  store_location: string;
  description?: string | null;
}

export const ScanPage: React.FC = () => {
  const { selectedStore, isLoading: isStoreLoading } = useStore();
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { addItem, error: itemError, isLoading: isItemLoading } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // This state now holds our new unified result type
  const [lastScannedItem, setLastScannedItem] = useState<UnifiedScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // --- NEW, MODIFIED HANDLESCAN FUNCTION ---
  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setLastScannedItem(null);

    try {
      // Step 1: Search the 'parts' table first
      // We assume the barcode IS the part number for parts
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .maybeSingle();

      if (partError) throw partError; // Handle database errors

      if (partData) {
        // --- Found a PART ---
        console.log('Found in Parts:', partData);
        setScanSuccess(`Part Found: ${partData.part_number}`);
        // Normalize the data into our unified type
        setLastScannedItem({
          type: 'part',
          id: partData.id,
          primaryIdentifier: partData.part_number,
          secondaryIdentifier: partData.bin_location,
          barcode: barcode,
          store_location: partData.store_location,
          description: partData.description,
        });
        return; // Stop here since we found a match
      }

      // Step 2: If no part was found, search the 'equipment' table
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('barcode', barcode) // Searching the 'barcode' column
        .eq('store_location', selectedStore)
        .maybeSingle();

      if (equipmentError) throw equipmentError;

      if (equipmentData) {
        // --- Found EQUIPMENT ---
        console.log('Found in Equipment:', equipmentData);
        setScanSuccess(`Equipment Found: ${equipmentData.stock_number}`);
        // Normalize the data into our unified type
        setLastScannedItem({
          type: 'equipment',
          id: equipmentData.stock_number, // Using stock_number as the unique ID
          primaryIdentifier: equipmentData.stock_number,
          secondaryIdentifier: `${equipmentData.make || ''} ${equipmentData.model || ''}`.trim(),
          barcode: barcode,
          store_location: equipmentData.store_location,
          description: equipmentData.description,
        });
        return; // Stop here
      }

      // Step 3: If nothing was found in either table, show an error
      throw new Error(`Item with barcode "${barcode}" not found in parts or equipment for store ${selectedStore}.`);

    } catch (err: any) {
      console.error('Scan processing error:', err);
      setScanError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, selectedStore]);
  
  const handleSaveItem = async (updates: { quantity: number; notes: string }) => {
    if (!lastScannedItem || !currentList) {
      setScanError("Cannot save: Missing item or list info.");
      return;
    }

    // Now we build the object to save based on the type of item scanned
    const newItemData = {
      list_id: currentList.id,
      barcode: lastScannedItem.barcode,
      part_number: lastScannedItem.primaryIdentifier, // Use part_number or stock_number
      bin_location: lastScannedItem.type === 'part' ? lastScannedItem.secondaryIdentifier : 'N/A', // Equipment might not have a bin
      store_location: lastScannedItem.store_location,
      quantity: updates.quantity,
      notes: updates.notes,
    };

    const addedItem = await addItem(newItemData);

    if (addedItem) {
      setScanSuccess(`Added ${updates.quantity} "${newItemData.part_number}" To List ✅`);
      setLastScannedItem(null);
      setTimeout(() => setScanSuccess(null), 3000);
    }
  };

  const handleCameraError = useCallback((error: string) => { setCameraError(error); }, []);
  const barcodeScannerComponent = useMemo(() => (<BarcodeScanner onScanSuccess={handleScan} onScanError={handleCameraError} />), [handleScan, handleCameraError]);
  
  const displayError = scanError || itemError;
  const displayLoading = isProcessing || isItemLoading;

  useEffect(() => { if (lists.length === 0) fetchLists(); }, [lists.length, fetchLists]);
  useEffect(() => { if (lists.length > 0 && !currentList) { setCurrentList(lists[0]); } }, [lists, currentList, setCurrentList]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan Item" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        {barcodeScannerComponent}
        <div className="space-y-2">
          {cameraError && <p className="p-3 text-center text-sm bg-yellow-100 text-yellow-800 rounded-lg">Camera Error: {cameraError}</p>}
          {displayError && <p className="p-3 text-center text-sm bg-red-100 text-red-800 rounded-lg">{displayError}</p>}
          {scanSuccess && <p className="p-3 text-center text-sm bg-green-100 text-green-800 rounded-lg">{scanSuccess}</p>}
        </div>
        <ScanResult
          item={lastScannedItem} // Pass the unified item object
          isLoading={displayLoading}
          onSave={handleSaveItem}
          onClear={() => { setLastScannedItem(null); setScanError(null); }}
        />
      </main>
      <BottomNav />
    </div>
  );
};