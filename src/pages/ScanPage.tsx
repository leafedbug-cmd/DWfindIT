import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { useStore } from '../contexts/StoreContext';
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
  const [viewMode, setViewMode] = useState<'add' | 'view'>('view');
  const [lastScannedPart, setLastScannedPart] = useState<any>(null);

  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { recentScan, addItem, clearRecentScan, isLoading } = useScanItemStore();
  const { selectedStore, isLoading: isStoreLoading } = useStore();

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
        .eq('store_location', selectedStore)
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
      setLastScannedPart(part);
      setScanSuccess(`${part.part_number} → Bin: ${part.bin_location}`);
      setTimeout(() => setScanSuccess(null), 5000);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

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

    console.log('Scanning in store:', selectedStore);

    try {
      setIsProcessing(true);
      setScanError(null);
      setScanSuccess(null);
      setLastScannedPart(null);

      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .single();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in your store (${selectedStore}).`);
      }

      setLastScannedPart(partData);

      if (viewMode === 'view') {
        setScanSuccess(`${barcode} → Bin: ${partData.bin_location}`);
        setTimeout(() => setScanSuccess(null), 5000);
        return;
      }

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

  if (isStoreLoading) {
    return <p className="p-4">Loading your store settings...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Scan Barcode" showBackButton />
      <main className="flex-1 p-4">
        {/* ...rest of your JSX unchanged... */}
        {/* You can keep all the same JSX from your original file here */}
      </main>
      <BottomNav />
    </div>
  );
};
