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

type PartRow = {
  part_number: string;
  Part_Description?: string | null;
  bin_location?: string | null;
  store_location?: string | null;
  [k: string]: any;
};

const OVERLAY_MS = 4000; // how long the overlay stays up

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore, isLoading: isStoreLoading } = useStore();
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { addItem, clearRecentScan } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view');

  const [lastScannedPart, setLastScannedPart] = useState<PartRow | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  // Handle scan
  const handleScan = useCallback(
    async (barcode: string) => {
      if (isProcessing) return;

      console.log('📷 Processing barcode scan:', barcode);
      setScanError(null);
      setScanSuccess(null);

      try {
        setIsProcessing(true);

        const { data: { user } } = await supabase.auth.getUser();

        const { data: partData, error: partError } = await supabase
          .from('parts')
          .select('*')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle();

        if (partError || !partData) {
          throw new Error(`Part "${barcode}" not found in store ${selectedStore}.`);
        }

        setLastScannedPart(partData as PartRow);
        setShowOverlay(true);
        // auto-hide overlay
        setTimeout(() => setShowOverlay(false), OVERLAY_MS);

        if (viewMode === 'view') {
          setScanSuccess(`${barcode} → Bin: ${partData.bin_location ?? '—'}`);
          return;
        }

        if (!currentList) throw new Error('No list selected.');

        const { data: listCheck, error: listError } = await supabase
          .from('lists')
          .select('id, name, user_id')
          .eq('id', currentList.id)
          .single();

        if (listError || !listCheck) throw new Error('List not found or access denied');
        if (listCheck.user_id !== user?.id) throw new Error('You do not have permission to add items to this list');

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
          const scanItemData = {
            barcode,
            part_number: partData.part_number,
            bin_location: partData.bin_location,
            store_location: partData.store_location,
            list_id: currentList.id,
            quantity: 1,
            notes: '',
          };
          await addItem(scanItemData);
          setScanSuccess(`Added ${barcode} to list`);
        }
      } catch (error: any) {
        console.error('Scan processing error:', error);
        setScanError(error.message);
      } finally {
        setIsProcessing(false);
        setTimeout(() => setScanError(null), 3000);
        setTimeout(() => setScanSuccess(null), 3000);
      }
    },
    [isProcessing, selectedStore, viewMode, currentList, addItem]
  );

  const handleCameraError = useCallback((error: string) => {
    console.error('Camera error:', error);
    setCameraError(error);
    setTimeout(() => setCameraError(null), 5000);
  }, []);

  const barcodeScannerComponent = useMemo(
    () => <BarcodeScanner onScanSuccess={handleScan} onScanError={handleCameraError} />,
    [handleScan, handleCameraError]
  );

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

        {/* Scanner with overlay container */}
        <div className="relative">
          {barcodeScannerComponent}

          {/* Compact HUD overlay */}
          {showOverlay && lastScannedPart && (
            <div
              className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 w-[95%] max-w-xl 
                         rounded-xl bg-black/70 text-white shadow-lg backdrop-blur-sm"
            >
              <div className="px-3 py-2">
                <div className="text-xs font-semibold tracking-wide opacity-90">
                  {lastScannedPart.part_number}
                </div>
                <div className="text-[11px] opacity-90 line-clamp-2">
                  {lastScannedPart.Part_Description ?? '—'}
                </div>

                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div>
                    <span className="opacity-60">Bin:</span>{' '}
                    <span className="font-medium">{lastScannedPart.bin_location ?? '—'}</span>
                  </div>
                  <div>
                    <span className="opacity-60">Store:</span>{' '}
                    <span className="font-medium">{lastScannedPart.store_location ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Camera Error Display */}
        {cameraError && (
          <div className="p-2 bg-red-100 text-red-800 rounded">Camera Error: {cameraError}</div>
        )}

        {/* Scan Processing Feedback */}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* (Optional) Result panel you already had */}
        <ScanResult
          item={lastScannedPart as any}
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
