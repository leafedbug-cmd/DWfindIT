// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore, Part, Equipment } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';

// ADDED: A type for our scan result overlay
type ScanResultData = (Part & { type: 'part' }) | (Equipment & { type: 'equipment' });

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // ADDED: State to hold the data for the new overlay
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  // CHANGED: The page title is now dynamic
  const pageTitle = listId ? "Add Item to List" : "Scan & View";

  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setScanResult(null); // Clear previous result on new scan

    try {
      const [partResult, equipmentResult] = await Promise.all([
        supabase
          .from('parts')
          .select('id, part_number, Part_Description, bin_location')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle(),
        supabase
          .from('equipment')
          .select('*') // Select all equipment fields
          .or(`stock_number.eq.${barcode},serial_number.eq.${barcode}`)
          .maybeSingle(),
      ]);

      let foundItem: ScanResultData | null = null;
      if (partResult.data) {
        foundItem = { ...partResult.data, type: 'part' };
      } else if (equipmentResult.data) {
        foundItem = { ...equipmentResult.data, type: 'equipment' };
      }

      if (!foundItem) {
        throw new Error(`No part or equipment found for barcode "${barcode}".`);
      }

      // CHANGED: Logic now depends on whether we are in "Add Mode" or "Lookup Mode"
      if (listId) {
        // --- ADD TO LIST MODE ---
        const newItemPayload = foundItem.type === 'part'
          ? { list_id: listId, item_type: 'part', part_id: foundItem.id, quantity: 1 }
          : { list_id: listId, item_type: 'equipment', equipment_stock_number: foundItem.stock_number, quantity: 1 };
        
        const newItem = await addItem(newItemPayload);
        if (!newItem) throw new Error('Failed to save the scanned item to the list.');
        setScanSuccess(`Successfully added item to list!`);
      } else {
        // --- LOOKUP MODE ---
        setScanResult(foundItem);
        // Auto-clear the overlay after 5 seconds
        setTimeout(() => setScanResult(null), 5000);
      }

    } catch (error: any) {
      setScanError(error.message);
      setTimeout(() => setScanError(null), 3500);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  }, [isProcessing, listId, selectedStore, addItem]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      {/* CHANGED: Dynamic page title */}
      <Header title={pageTitle} showBackButton />
      
      <main className="flex-1 p-4 space-y-4 relative"> {/* ADDED: relative positioning */}
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />
        
        {isProcessing && <p className="text-center text-gray-500">Processing...</p>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* REMOVED: The "Done Scanning" button */}

        {/* ADDED: The new scan result overlay */}
        {scanResult && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm text-orange-500 p-4 rounded-lg shadow-lg animate-fade-in-up">
            {scanResult.type === 'part' && (
              <div>
                <p className="font-bold text-lg">{scanResult.part_number}</p>
                <p><strong>Bin:</strong> {scanResult.bin_location}</p>
                <p><strong>Desc:</strong> {scanResult.Part_Description || 'N/A'}</p>
              </div>
            )}
            {scanResult.type === 'equipment' && (
               <div>
                <p className="font-bold text-lg">{scanResult.make} {scanResult.model}</p>
                <p><strong>Stock #:</strong> {scanResult.stock_number}</p>
                <p><strong>Serial #:</strong> {scanResult.serial_number || 'N/A'}</p>
                <p><strong>Desc:</strong> {scanResult.description || 'N/A'}</p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};