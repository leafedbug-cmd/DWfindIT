import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { supabase } from '../services/supabase';
import { Search, Package } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { recentScan, addItem, clearRecentScan, isLoading } = useScanItemStore();
  
  useEffect(() => {
    if (!lists.length) {
      fetchLists();
    }
  }, [lists, fetchLists]);
  
  useEffect(() => {
    if (lists.length > 0 && !currentList) {
      setCurrentList(lists[0]);
    }
  }, [lists, currentList, setCurrentList]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .ilike('part_number', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPart = async (part: any) => {
    try {
      setIsProcessing(true);
      setScanError(null);
      
      if (!currentList) {
        setScanError('No list selected. Please select or create a list first.');
        return;
      }
      
      const partInfo = {
        barcode: part.part_number, // Using part number as barcode for manual entries
        part_number: part.part_number,
        bin_location: part.bin_location,
        list_id: currentList.id,
        quantity: 1,
        notes: ''
      };
      
      await addItem(partInfo);
      setSearchQuery('');
      setSearchResults([]);
      
    } catch (error: any) {
      setScanError(error.message || 'Failed to add part');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleScan = async (barcode: string) => {
    try {
      setIsProcessing(true);
      setScanError(null);
      
      if (!currentList) {
        setScanError('No list selected. Please select or create a list first.');
        return;
      }
      
      // Look up the REAL part in your parts table
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .single();

      if (partError || !partData) {
        setScanError(`Part ${barcode} not found in inventory`);
        return;
      }
      
      // Check if this item already exists in the current list
      const { data: existingItem } = await supabase
        .from('scan_items')
        .select('*')
        .eq('barcode', barcode)
        .eq('list_id', currentList.id)
        .single();

      if (existingItem) {
        // Update quantity instead of creating duplicate
        const { error: updateError } = await supabase
          .from('scan_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
        
        setScanError(`Updated quantity for ${barcode} to ${existingItem.quantity + 1}`);
      } else {
        // Use REAL data from your parts table
        const partInfo = {
          barcode: barcode,
          part_number: partData.part_number,
          bin_location: partData.bin_location,
          list_id: currentList.id,
          quantity: 1,
          notes: ''
        };
        
        await addItem(partInfo);
      }
      
    } catch (error: any) {
      setScanError(error.message || 'Failed to process scan');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleScanError = (error: string) => {
    setScanError(error);
  };
  
  const handleSaveItem = async (updates: any) => {
    if (!recentScan || !currentList) return;
    
    try {
      setIsProcessing(true);
      navigate(`/list/${currentList.id}`);
      clearRecentScan();
    } catch (error: any) {
      setScanError(error.message || 'Failed to save item');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header 
        title="Scan Barcode" 
        showBackButton
      />
      
      <main className="flex-1 p-4">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Scanner</h2>
            {currentList && (
              <div className="text-sm bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                List: {currentList.name}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by part number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                {searchResults.map((part) => (
                  <button
                    key={part.part_number}
                    onClick={() => handleSelectPart(part)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                  >
                    <Package className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">{part.part_number}</div>
                      <div className="text-sm text-gray-500">Bin: {part.bin_location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <BarcodeScanner 
              onScanSuccess={handleScan}
              onScanError={handleScanError}
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Scan Result</h2>
          
          <ScanResult
            item={recentScan}
            isLoading={isProcessing}
            error={scanError}
            onSave={handleSaveItem}
            clearResult={clearRecentScan}
          />
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};