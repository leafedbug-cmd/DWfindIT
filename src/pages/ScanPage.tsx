// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { Keyboard, Camera, Plus, X } from 'lucide-react'; // NEW: Added icons for new UI

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false); // NEW: State for manual entry modal
  const [manualBarcode, setManualBarcode] = useState('');

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
      const [partResult, equipmentResult] = await Promise.all([
        supabase
          .from('parts')
          .select('id, part_number')
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

      if (partResult.data) {
        newItemPayload = {
          list_id: listId,
          item_type: 'part',
          part_id: partResult.data.id,
          quantity: 1,
        };
        setScanSuccess(`Found Part: ${partResult.data.part_number}`);
      } else if (equipmentResult.data) {
        newItemPayload = {
          list_id: listId,
          item_type: 'equipment',
          equipment_stock_number: equipmentResult.data.stock_number,
          quantity: 1,
        };
        setScanSuccess(`Found Equipment: ${equipmentResult.data.stock_number}`);
      } else {
        throw new Error(`No part or equipment found for barcode "${barcode}" in store ${selectedStore}.`);
      }

      const newItem = await addItem(newItemPayload);
      if (!newItem) {
        throw new Error('Failed to save the scanned item to the list.');
      }
      
      setScanSuccess(`Successfully added item to list!`);
      if (isManualEntryOpen) {
        setIsManualEntryOpen(false); // Close modal on success
        setManualBarcode('');
      }

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3500);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  }, [isProcessing, listId, selectedStore, addItem, isManualEntryOpen]);
  
  const goBackToList = () => {
    if (listId) navigate(`/list/${listId}`);
    else navigate('/lists');
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-black">
      {/* NEW: Custom Header for this page */}
      <div className="flex items-center justify-between p-2 bg-gray-800 text-white">
        <Header title="Add Item to List" showBackButton />
        <button onClick={() => setIsManualEntryOpen(true)} className="p-2">
          <Keyboard className="h-6 w-6" />
        </button>
      </div>
      
      <main className="flex-1 relative">
        {/* The BarcodeScanner now sits inside a relative container */}
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />

        {/* --- OVERLAYS --- */}
        {/* OVERLAY: Camera Switch Button (Top Right) */}
        <button className="absolute top-4 right-4 p-2 bg-gray-900/50 text-white rounded-full">
          <Camera className="h-6 w-6" />
        </button>

        {/* OVERLAY: Status Indicator (Bottom Right) */}
        <div className="absolute bottom-5 right-5">
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>

        {/* OVERLAY: Done Scanning Button (Bottom Center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={goBackToList}
              className="flex items-center justify-center px-6 py-3 bg-gray-900/80 backdrop-blur-sm text-white rounded-full font-medium shadow-lg"
            >
                <Plus className="h-5 w-5 mr-2" />
                Done Scanning
            </button>
        </div>
      </main>

      {/* NEW: Manual Entry Modal */}
      {isManualEntryOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Manual Entry</h3>
                    <button onClick={() => setIsManualEntryOpen(false)}><X className="h-5 w-5"/></button>
                </div>
                <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Enter Part # or Stock #"
                    className="w-full p-2 border rounded-md"
                />
                <button
                    onClick={() => handleScan(manualBarcode)}
                    disabled={!manualBarcode || isProcessing}
                    className="w-full p-2 bg-orange-600 text-white rounded-md disabled:bg-gray-400"
                >
                    {isProcessing ? 'Searching...' : 'Find & Add to List'}
                </button>
            </div>
        </div>
      )}

      {/* Global success/error messages can be placed here if needed */}
      {scanError && <div className="fixed bottom-20 left-4 right-4 p-2 bg-red-100 text-red-800 rounded z-30">{scanError}</div>}
      {scanSuccess && <div className="fixed bottom-20 left-4 right-4 p-2 bg-green-100 text-green-800 rounded z-30">{scanSuccess}</div>}

      <BottomNav />
    </div>
  );
};