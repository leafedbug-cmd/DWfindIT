import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { supabase } from '../services/supabase';
import { Search, Package, Eye, ListPlus } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'add' | 'view'>('view'); // Default to view mode
  const [lastScannedPart, setLastScannedPart] = useState<any>(null);
  
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
    if (viewMode === 'view') {
      // Just display the part info
      setLastScannedPart(part);
      setScanSuccess(`${part.part_number} → Bin: ${part.bin_location}`);
      setTimeout(() => setScanSuccess(null), 5000);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    // Add mode - existing logic
    try {
      setIsProcessing(true);
      setScanError(null);
      
      if (!currentList) {
        setScanError('No list selected. Please select or create a list first.');
        return;
      }
      
      const partInfo = {
        barcode: part.part_number,
        part_number: part.part_number,
        bin_location: part.bin_location,
        list_id: currentList.id,
        quantity: 1,
        notes: ''
      };
      
      await addItem(partInfo);
      setSearchQuery('');
      setSearchResults([]);
      setScanSuccess(`Added ${part.part_number} to list`);
      setTimeout(() => setScanSuccess(null), 3000);
      
    } catch (error: any) {
      setScanError(error.message || 'Failed to add part');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleScan = async (barcode: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setScanError(null);
      setScanSuccess(null);
      setLastScannedPart(null);

      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .single();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in inventory.`);
      }

      // Store the scanned part for display
      setLastScannedPart(partData);

      if (viewMode === 'view') {
        // View mode - just display the bin location
        setScanSuccess(`${barcode} → Bin: ${partData.bin_location}`);
        setTimeout(() => setScanSuccess(null), 5000); // Show for 5 seconds
        return;
      }

      // Add mode - existing logic
      if (!currentList) {
        throw new Error("No list selected. Please select or create a list first.");
      }

      const { data: existingItem } = await supabase
        .from('scan_items')
        .select('*')
        .eq('barcode', barcode)
        .eq('list_id', currentList.id)
        .single();

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        const { error: updateError } = await supabase
          .from('scan_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;

        setScanSuccess(`Updated ${barcode} quantity to ${newQuantity}`);
        setTimeout(() => setScanSuccess(null), 2000);
      } else {
        const partInfo = {
          barcode,
          part_number: partData.part_number,
          bin_location: partData.bin_location,
          list_id: currentList.id,
          quantity: 1,
          notes: ''
        };

        await addItem(partInfo);
        setScanSuccess(`Added ${barcode} - Bin: ${partData.bin_location}`);
        setTimeout(() => setScanSuccess(null), 2000);
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      setScanError(error.message || "Failed to process scan");
      setTimeout(() => setScanError(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleScanError = (error: string) => {
    setScanError(error);
    setTimeout(() => setScanError(null), 3000);
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
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('view')}
                  className={`flex items-center px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'view' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </button>
                <button
                  onClick={() => setViewMode('add')}
                  className={`flex items-center px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'add' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  <ListPlus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
              
              {viewMode === 'add' && currentList && (
                <div className="text-sm bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                  List: {currentList.name}
                </div>
              )}
            </div>
          </div>

          {/* Mode indicator */}
          <div className="mb-2 text-sm text-gray-600">
            Mode: <span className="font-medium">
              {viewMode === 'view' ? 'View Only (bin lookup)' : 'Add to List'}
            </span>
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
          
          {/* Success Message */}
          {scanSuccess && (
            <div className={`mb-2 p-3 rounded text-sm ${
              viewMode === 'view' 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              ✓ {scanSuccess}
            </div>
          )}
          
          {/* Last Scanned Part Info (View Mode Only) */}
          {viewMode === 'view' && lastScannedPart && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Part Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Part Number:</span>
                  <span className="font-medium">{lastScannedPart.part_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bin Location:</span>
                  <span className="font-medium text-lg text-orange-600">
                    {lastScannedPart.bin_location}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <BarcodeScanner 
              onScanSuccess={handleScan}
              onScanError={handleScanError}
            />
          </div>
        </div>
        
        {viewMode === 'add' && (
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
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};