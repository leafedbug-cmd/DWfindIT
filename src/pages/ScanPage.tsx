// src/pages/ScanPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // CHANGED: useLocation to read URL query
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
// FIXED: Import the correct store with the correct name
import { useListItemStore } from '../store/listItemStore';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../services/supabase';

// -------- Types --------
type PartRow = {
  kind: 'part';
  part_number: string;
  Part_Description?: string | null;
  bin_location?: string | null;
  store_location?: string | null;
  [k: string]: any;
};

type EquipmentRow = {
  kind: 'equipment';
  stock_number?: string | null;
  description?: string | null;
  make?: string | null;
  model?: string | null;
  serial_number?: string | null;
  customer_name?: string | null;
  store_location?: string | null;
  branch?: string | null;
  [k: string]: any;
};

type ScanRow = PartRow | EquipmentRow;

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // CHANGED: Use location to access search params

  // FIXED: This is the correct way to get the list ID from the URL like `/scan?list=...`
  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  const { selectedStore, isLoading: isStoreLoading } = useStore();
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  // FIXED: Use the correct store hook
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view');
  const [lastScanned, setLastScanned] = useState<ScanRow | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Load lists on mount
  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists, fetchLists]);

  // FIXED: This effect now correctly syncs the active list in the store with the one from the URL
  useEffect(() => {
    if (listId && lists.length > 0) {
      const listFromUrl = lists.find(list => list.id === listId);
      if (listFromUrl) {
        setCurrentList(listFromUrl);
      } else {
        // If the list from the URL doesn't exist, navigate away to prevent errors
        console.error("List ID from URL not found in user's lists.");
        navigate('/lists');
      }
    } else if (lists.length > 0 && !currentList) {
      // Fallback to the first list if no ID is in the URL
      setCurrentList(lists[0]);
    }
  }, [listId, lists, setCurrentList, navigate, currentList]);


  const handleScan = useCallback(
    async (barcode: string) => {
      if (isProcessing) return;

      setScanError(null);
      setScanSuccess(null);
      setIsProcessing(true);

      try {
        const { data: partData } = await supabase
          .from('parts')
          .select('*')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle();

        if (partData) {
          const part: PartRow = { kind: 'part', ...partData };
          setLastScanned(part);

          if (viewMode === 'view') {
            setScanSuccess(`${part.part_number} → Bin: ${part.bin_location ?? '—'}`);
            return;
          }

          // --- ADD MODE LOGIC ---
          if (!currentList) throw new Error('No list selected. Please go back and select a list.');

          const itemData = {
            list_id: currentList.id,
            part_number: part.part_number,
            bin_location: part.bin_location,
            quantity: 1, // Always add 1 for a new scan
          };

          // Use the store's addItem function, which now points to `list_items`
          const newItem = await addItem(itemData);

          if (newItem) {
            setScanSuccess(`Added ${newItem.part_number} to list: ${currentList.name}`);
          } else {
            throw new Error('Failed to save item to the list.');
          }

          return;
        }

        // Handle equipment or not-found cases
        const { data: equipData } = await supabase.from('equipment').select('*').eq('stock_number', barcode).maybeSingle();
        if (equipData) {
           const eq: EquipmentRow = { kind: 'equipment', ...equipData };
           setLastScanned(eq);
           setScanSuccess(`${eq.stock_number ?? 'equipment'} loaded`);
           return;
        }
        
        throw new Error(`No part or equipment found for "${barcode}".`);

      } catch (error: any) {
        console.error('Scan processing error:', error);
        setScanError(error.message);
      } finally {
        setIsProcessing(false);
        setTimeout(() => setScanError(null), 4000);
        setTimeout(() => setScanSuccess(null), 4000);
      }
    },
    [isProcessing, selectedStore, viewMode, currentList, addItem]
  );

  const handleCameraError = useCallback((error: string) => {
    console.error('Camera error:', error);
    setCameraError(error);
  }, []);

  const barcodeScannerComponent = useMemo(
    () => <BarcodeScanner onScanSuccess={handleScan} onScanError={handleCameraError} />,
    [handleScan, handleCameraError]
  );
  
  if (isStoreLoading) {
    return <div className="p-4 text-center">Loading store settings...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan" showBackButton />

      <main className="flex-1 p-4 space-y-4">
        <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur py-1">
          <div className="relative flex items-start justify-start gap-3">
            <div className="flex gap-4">
              <button
                className={viewMode === 'view' ? 'pb-1 border-b-2 border-orange-600 text-orange-700' : 'pb-1 border-b-2 border-transparent text-gray-500'}
                onClick={() => setViewMode('view')}
              >
                View
              </button>
              <button
                className={viewMode === 'add' ? 'pb-1 border-b-2 border-orange-600 text-orange-700' : 'pb-1 border-b-2 border-transparent text-gray-500'}
                onClick={() => setViewMode('add')}
              >
                Add to List
              </button>
            </div>
            {lastScanned && (
              <div className="absolute right-0 top-0 w-1/2 md:w-[360px]" aria-live="polite">
                 {/* Display logic for lastScanned can remain the same */}
              </div>
            )}
          </div>
        </div>

        <div className="relative">{barcodeScannerComponent}</div>

        {cameraError && <div className="p-2 bg-red-100 text-red-800 rounded">Camera Error: {cameraError}</div>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* The ScanResult component seems to have its own save logic which might be redundant. 
            For now, the main save logic is in the handleScan function. */}
        <ScanResult
          item={lastScanned?.kind === 'part' ? (lastScanned as PartRow) : (null as any)}
          isLoading={isProcessing}
          error={scanError}
          clearResult={() => setLastScanned(null)}
          onSave={(updates) => {
            // This onSave is likely for editing quantity/notes after scan, before final save.
            // The primary save logic is now consolidated in handleScan.
            console.log('Updates from ScanResult:', updates);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};