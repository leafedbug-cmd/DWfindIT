// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore, Part, Equipment } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { Plus, Minus, CheckCircle } from 'lucide-react';

type ScanResultData = (Part & { type: 'part' }) | (Equipment & { type: 'equipment' });

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  // ADDED: State to manage the quantity of the scanned item
  const [quantity, setQuantity] = useState(1);

  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  const pageTitle = listId ? "Add Item to List" : "Scan & View";

  // CHANGED: The handleScan function now ONLY looks up an item and displays it.
  const handleScan = useCallback(async (barcode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setScanError(null);
    setScanSuccess(null);
    setScanResult(null);

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
          .select('*')
          .or(`stock_number.eq.${barcode},serial_number.eq.${barcode}`)
          .maybeSingle(),
      ]);

      let foundItem: ScanResultData | null = null;
      if (partResult.data) {
        foundItem = { ...partResult.data, type: 'part' };
      } else if (equipmentResult.data) {
        foundItem = { ...equipmentResult.data, type: 'equipment' };
      }

      if (foundItem) {
        setScanResult(foundItem);
        setQuantity(1); // Reset quantity to 1 for each new scan
      } else {
        throw new Error(`No part or equipment found for barcode "${barcode}".`);
      }

    } catch (error: any) {
      setScanError(error.message);
      setTimeout(() => setScanError(null), 3500);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, selectedStore]);

  // ADDED: A new function to handle the manual "Add to List" button click.
  const handleAddItemToList = async () => {
    if (!scanResult || !listId) return;

    setIsProcessing(true);
    setScanError(null);

    try {
      const newItemPayload = scanResult.type === 'part'
        ? { list_id: listId, item_type: 'part', part_id: scanResult.id, quantity }
        : { list_id: listId, item_type: 'equipment', equipment_stock_number: scanResult.stock_number, quantity };
      
      const newItem = await addItem(newItemPayload);
      if (!newItem) throw new Error('Failed to save the scanned item to the list.');
      
      setScanSuccess(`Added ${quantity} x item to list!`);
      setScanResult(null); // Clear the overlay after successful add

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3500);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title={pageTitle} showBackButton />
      
      <main className="flex-1 p-4 space-y-4 relative">
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />
        
        {isProcessing && <p className="text-center text-gray-500">Processing...</p>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>}

        {/* CHANGED: The overlay is now more complex and shows controls in "Add Mode" */}
        {scanResult && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm p-4 rounded-lg shadow-lg animate-fade-in-up">
            {/* --- Item Info --- */}
            <div className="text-orange-500">
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
            
            {/* --- Controls (only show in "Add Mode") --- */}
            {listId && (
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">Quantity:</span>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="bg-white/20 text-white rounded-full w-8 h-8 font-bold">-</button>
                  <span className="text-white text-lg font-bold w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="bg-white/20 text-white rounded-full w-8 h-8 font-bold">+</button>
                </div>
                <button 
                  onClick={handleAddItemToList}
                  className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg flex items-center"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Add to List
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};