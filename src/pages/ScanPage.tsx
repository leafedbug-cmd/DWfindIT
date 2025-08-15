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
  const { addItem, clearRecentScan } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view');
  const [lastScannedPart, setLastScannedPart] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists, fetchLists]);

  useEffect(() => {
    if (lists.length > 0 && !currentList) {
      setCurrentList(lists[0]);
    }
  }, [lists, currentList, setCurrentList]);

  // --- UPDATED HANDLESCAN FUNCTION ---
  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return; // Prevent multiple scans at once

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setLastScannedPart(null);

    try {
      // 1. Find the part in the 'parts' table
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .maybeSingle();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in store ${selectedStore}.`);
      }
      
      // Immediately show the user what was found
      setLastScannedPart(partData);
      setScanSuccess(`Found: ${partData.part_number}`);

      // 2. If we are in 'add' mode, proceed to save the item
      if (viewMode === 'add') {
        if (!currentList) {
          throw new Error('No list is selected to add the item to.');
        }

        // 3. Construct the COMPLETE object with all necessary fields
        const newItemData = {
          list_id: currentList.id,        // <-- The missing piece
          barcode: barcode,               // <-- The other missing piece
          part_number: partData.part_number,
          bin_location: partData.bin_location,
          store_location: partData.store_location,
          quantity: 1, // You can adjust this if needed
          notes: '',   // Default empty notes
        };

        // 4. Call addItem with the complete, correct data
        await addItem(newItemData);
        setScanSuccess(`Added ${partData.part_number} to list: ${currentList.name}`);
      }
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setScanError(err.message);
    } finally {
      setIsProcessing(false);
      // Auto-clear success/error messages after 3 seconds
      setTimeout(() => {
        setScanSuccess(null);
        setScanError(null);
      }, 3000);
    }
  }, [isProcessing, selectedStore, currentList, viewMode, addItem]);
  // --- END OF UPDATED FUNCTION ---

  const handleCameraError = useCallback((error: string) => {
    console.error('Camera error:', error);
    setCameraError(error);
    setTimeout(() => setCameraError(null), 5000);
  }, []);

  const barcodeScannerComponent = useMemo(() => (
    <BarcodeScanner 
      onScanSuccess={handleScan} 
      onScanError={handleCameraError}
    />
  ), [handleScan, handleCameraError]);

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
        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            className={`w-1/2 p-2 rounded-md font-semibold text-sm transition-colors ${
              viewMode === 'view' ? 'bg-white text-orange-600 shadow' : 'text-gray-600'
            }`}
            onClick={() => setViewMode('view')}
          >
            View Part Info
          </button>
          <button
            className={`w-1/2 p-2 rounded-md font-semibold text-sm transition-colors ${
              viewMode === 'add' ? 'bg-white text-orange-600 shadow' : 'text-gray-600'
            }`}
            onClick={() => setViewMode('add')}
          >
            Add to List
          </button>
        </div>
        
        {/* List Selector for Add Mode */}
        {viewMode === 'add' && (
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <label htmlFor="list-select" className="block text-sm font-medium text-gray-700 mb-1">
              Selected List:
            </label>
            <select
              id="list-select"
              value={currentList?.id || ''}
              onChange={(e) => {
                const selectedList = lists.find(l => l.id === e.target.value);
                setCurrentList(selectedList || null);
              }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            >
              {lists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Camera Scanner */}
        {barcodeScannerComponent}

        {/* Feedback Area */}
        {cameraError && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg text-center">
            Camera Error: {cameraError}
          </div>
        )}
        {scanError && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg text-center">
            {scanError}
          </div>
        )}
        {scanSuccess && (
          <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center">
            {scanSuccess}
          </div>
        )}

        {/* Scan Result */}
        <ScanResult
          item={lastScannedPart}
          isLoading={isProcessing}
          error={scanError}
          clearResult={clearRecentScan}
          // The onSave prop may no longer be needed if all logic is in handleScan
          onSave={(updates) => {
            // This logic could be for editing notes/quantity AFTER a scan
            console.log("Save clicked in ScanResult:", updates)
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};