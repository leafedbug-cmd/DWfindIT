// src/pages/ScanPage.tsx
// Persistent compact result pill pinned to the right of "Add to List"
// Tapping the pill’s main value opens the phone keyboard (readOnly <input> with auto-select)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // <-- ADDED useParams
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
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
  const { listId } = useParams<{ listId: string }>(); // <-- ADDED: Get listId from URL
  const navigate = useNavigate();
  const { selectedStore, isLoading: isStoreLoading } = useStore();
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { addItem, clearRecentScan } = useScanItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view');

  // Persist the LAST scanned item; never auto-hide
  const [lastScanned, setLastScanned] = useState<ScanRow | null>(null);
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
  
  // <-- ADDED: This entire block synchronizes the store with the URL
  // This is the main fix for the bug.
  useEffect(() => {
    if (listId && lists.length > 0) {
      const listFromUrl = lists.find(list => list.id === listId);
      if (listFromUrl) {
        setCurrentList(listFromUrl);
      }
    }
  }, [listId, lists, setCurrentList]);

  // -------- Scan handler --------
  const handleScan = useCallback(
    async (barcode: string) => {
      if (isProcessing) return;

      console.log('📷 Processing barcode scan:', barcode);
      setScanError(null);
      setScanSuccess(null);

      try {
        setIsProcessing(true);

        const { data: { user } } = await supabase.auth.getUser();

        // 1) Try PARTS (by part_number + store)
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

          // ADD mode for parts
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
              part_number: part.part_number,
              bin_location: part.bin_location,
              store_location: part.store_location,
              list_id: currentList.id,
              quantity: 1,
              notes: '',
            };
            await addItem(scanItemData);
            setScanSuccess(`Added ${barcode} to list`);
          }
          return;
        }

        // 2) Try EQUIPMENT (by stock_number, then serial_number)
        const eq1 = await supabase.from('equipment').select('*').eq('stock_number', barcode).maybeSingle();
        const equipData = eq1.data
          ? eq1.data
          : (await supabase.from('equipment').select('*').eq('serial_number', barcode).maybeSingle()).data;

        if (equipData) {
          const eq: EquipmentRow = { kind: 'equipment', ...equipData };
          setLastScanned(eq);
          setScanSuccess(`${eq.stock_number ?? eq.serial_number ?? 'equipment'} loaded`);
          return;
        }

        // Nothing found
        throw new Error(`No part or equipment found for "${barcode}".`);
      } catch (error: any) {
        console.error('Scan processing error:', error);
        setScanError(error.message);
      } finally {
        setIsProcessing(false);
        // keep success/error brief, but DO NOT clear lastScanned
        setTimeout(() => setScanError(null), 3000);
        setTimeout(() => setScanSuccess(null), 3000);
      }
    },
    [isProcessing, selectedStore, viewMode, currentList, addItem]
  );

  // Camera error
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
        {/* Top bar: Mode Toggle + persistent HUD anchored right */}
        <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur py-1">
          <div className="relative flex items-start justify-start gap-3">
            {/* Left: tabs */}
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

            {/* Right: persistent compact pill (tappable input that opens keyboard) */}
            {lastScanned && (
              <div className="absolute right-0 top-0 w-1/2 md:w-[360px]" aria-live="polite">
                <div
                  className={`rounded-xl text-white px-4 py-2 shadow-md overflow-hidden ${
                    lastScanned.kind === 'part' ? 'bg-gray-900' : 'bg-slate-900'
                  }`}
                >
                  {lastScanned.kind === 'part' ? (
                    <>
                      <input
                        className="bg-transparent text-sm font-semibold truncate w-full outline-none"
                        value={(lastScanned as PartRow).part_number}
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                        inputMode="text"
                      />
                      <div className="flex items-center text-xs opacity-90 justify-between gap-2">
                        <span className="truncate">{(lastScanned as PartRow).Part_Description || '—'}</span>
                        <span className="ml-2 whitespace-nowrap">Bin: {(lastScanned as PartRow).bin_location || '—'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="bg-transparent text-sm font-semibold truncate w-full outline-none"
                        value={
                          (lastScanned as EquipmentRow).stock_number ||
                          (lastScanned as EquipmentRow).serial_number ||
                          ''
                        }
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                        inputMode="text"
                      />
                      <div className="flex items-center text-xs opacity-90 justify-between gap-2">
                        <span className="truncate">{(lastScanned as EquipmentRow).description || '—'}</span>
                        <span className="ml-2 whitespace-nowrap">SN: {(lastScanned as EquipmentRow).serial_number || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner */}
        <div className="relative">{barcodeScannerComponent}</div>

        {/* Camera Error Display */}
        {cameraError && <div className="p-2 bg-red-100 text-red-800 rounded">Camera Error: {cameraError}</div>}

        {/* Scan Processing Feedback */}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* Keep existing result panel for PARTS only */}
        <ScanResult
          item={lastScanned?.kind === 'part' ? (lastScanned as PartRow) : (null as any)}
          isLoading={isProcessing}
          error={scanError}
          clearResult={clearRecentScan}
          onSave={(updates) => {
            if (lastScanned?.kind === 'part') {
              const p = lastScanned as PartRow;
              addItem({ ...p, ...updates });
            }
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};