// src/pages/ScanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useListItemStore, Part, Equipment } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { CheckCircle } from 'lucide-react';

// --- Keypad Component ---
// This component is self-contained and will be used by ScanPage.
const Keypad = ({ initialValue, onDone, onCancel }: { initialValue: number, onDone: (value: number) => void, onCancel: () => void }) => {
    const [inputValue, setInputValue] = useState(String(initialValue));

    const handleButtonClick = (value: string) => {
        if (inputValue.length >= 6) return; // Limit input length
        setInputValue(current => (current === '0' ? value : current + value));
    };

    const handleBackspace = () => {
        setInputValue(current => (current.length > 1 ? current.slice(0, -1) : '0'));
    };

    const handleDone = () => {
        const finalValue = parseInt(inputValue, 10);
        if (!isNaN(finalValue)) {
            onDone(finalValue);
        }
    };

    const keyLayout = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs dark:bg-slate-900">
                <div className="text-right text-4xl font-semibold bg-gray-100 rounded-lg p-3 mb-4 break-all text-gray-900 dark:bg-slate-800 dark:text-gray-100">
                    {inputValue}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {keyLayout.flat().map((key, index) => {
                        if (key === '') return <div key={index}></div>;
                        const action = key === '⌫' ? handleBackspace : () => handleButtonClick(key);
                        return (
                            <button key={index} onClick={action} className="text-2xl h-16 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                                {key}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={onCancel} className="text-lg py-3 font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                        Cancel
                    </button>
                    <button onClick={handleDone} className="text-lg py-3 font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};


type ScanResultData = (Part & { type: 'part'; store_location?: string | null; }) | (Equipment & { type: 'equipment'; store_location?: string | null; });

export const ScanPage: React.FC = () => {
  const location = useLocation();
  const { selectedStore } = useStore();
  const { addItem } = useListItemStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false); // ADDED: State for keypad visibility

  const listId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('list');
  }, [location.search]);

  const pageTitle = listId ? "Add Item to List" : "Scan & View";

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
          .select('id, part_number, Part_Description, bin_location, store_location')
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
        setQuantity(1);
      } else {
        throw new Error(`No part or equipment found for barcode "${barcode}".`);
      }

    } catch (error: any) {
      setScanError(error.message);
      setTimeout(() => setScanError(null), 3500);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, listId, selectedStore]);

  const handleAddItemToList = async () => {
    if (!scanResult || !listId || quantity <= 0) return;

    setIsProcessing(true);
    setScanError(null);
    try {
      const newItemPayload = scanResult.type === 'part'
        ? { list_id: listId, item_type: 'part', part_id: scanResult.id, quantity }
        : { list_id: listId, item_type: 'equipment', equipment_stock_number: (scanResult as Equipment).stock_number, quantity };
      
      const newItem = await addItem(newItemPayload);
      if (!newItem) throw new Error('Failed to save the scanned item to the list.');
      
      setScanSuccess(`Added ${quantity} x item to list!`);
      setScanResult(null);
    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanError(null), 3500);
      setTimeout(() => setScanSuccess(null), 3500);
    }
  };
  
  // ADDED: Handler for when keypad is done
  const handleKeypadDone = (newQuantity: number) => {
    setQuantity(newQuantity);
    setIsKeypadOpen(false);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <Header title={pageTitle} showBackButton />
      
      <main className="flex-1 p-4 space-y-4 relative">
        <BarcodeScanner onScanSuccess={handleScan} onScanError={setScanError} />
        
        {isProcessing && <p className="text-center text-gray-500 dark:text-gray-300">Processing...</p>}
        {scanError && <div className="p-2 bg-red-100 text-red-800 rounded dark:bg-red-900/40 dark:text-red-200">{scanError}</div>}
        {scanSuccess && <div className="p-2 bg-green-100 text-green-800 rounded dark:bg-green-900/50 dark:text-green-200">{scanSuccess}</div>}

        {scanResult && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm p-4 rounded-lg shadow-lg animate-fade-in-up">
            <div className="text-orange-500">
              {scanResult.type === 'part' && (
                <div>
                  <p className="font-bold text-lg">{scanResult.part_number}</p>
                  <p><strong>Bin:</strong> {scanResult.bin_location}</p>
                  <p><strong>Desc:</strong> {scanResult.Part_Description || 'N/A'}</p>
                  <p><strong>Store:</strong> {scanResult.store_location || 'N/A'}</p>
                </div>
              )}
              {scanResult.type === 'equipment' && (
                 <div>
                  <p className="font-bold text-lg">{(scanResult as Equipment).make} {(scanResult as Equipment).model}</p>
                  <p><strong>Stock #:</strong> {scanResult.stock_number}</p>
                  <p><strong>Serial #:</strong> {scanResult.serial_number || 'N/A'}</p>
                  <p><strong>Invoice Date:</strong> {formatDate(scanResult.supplier_invoice_date)}</p>
                  <p><strong>Store:</strong> {scanResult.store_location || 'N/A'}</p>
                </div>
              )}
            </div>
            
            {listId && (
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                {/* UPDATED: Quantity controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">Quantity:</span>
                  <button onClick={() => setQuantity(q => Math.max(0, q - 1))} className="bg-white/20 text-white rounded-full w-8 h-8 font-bold text-lg">-</button>
                  
                  {/* CHANGED: From input to clickable div */}
                  <div
                    onClick={() => setIsKeypadOpen(true)}
                    className="bg-transparent text-white text-lg font-bold w-16 text-center focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-md cursor-pointer py-1"
                  >
                    {quantity}
                  </div>

                  <button onClick={() => setQuantity(q => q + 1)} className="bg-white/20 text-white rounded-full w-8 h-8 font-bold text-lg">+</button>
                </div>

                <button 
                  onClick={handleAddItemToList}
                  disabled={quantity === 0 || isProcessing}
                  className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Add to List
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* ADDED: Conditionally render Keypad */}
      {isKeypadOpen && (
        <Keypad
            initialValue={quantity}
            onDone={handleKeypadDone}
            onCancel={() => setIsKeypadOpen(false)}
        />
      )}
      
      <BottomNav />
    </div>
  );
};
