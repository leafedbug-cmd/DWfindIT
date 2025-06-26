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
  
  // everything else remains the same...

  const handleScan = async (barcode: string) => {
    console.log("📸 SCANNED BARCODE:", barcode);
    alert(`Scanned: ${barcode}`); // ✅ debug feedback

    try {
      setIsProcessing(true);
      setScanError(null);

      if (!currentList) {
        throw new Error("No list selected. Please select or create a list first.");
      }

      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .single();

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in inventory.`);
      }

      const { data: existingItem } = await supabase
        .from('scan_items')
        .select('*')
        .eq('barcode', barcode)
        .eq('list_id', currentList.id)
        .single();

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('scan_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;

        setScanError(`✅ Updated quantity for ${barcode} to ${existingItem.quantity + 1}`);
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
        console.log("✅ Added part:", partInfo);
      }
    } catch (error: any) {
      console.error("❌ SCAN ERROR:", error);
      setScanError(error.message || "Unknown scan error");
      alert(`⚠️ Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveItem = async (updates: any) => {
    if (!recentScan || !currentList) return;

    try {
      setIsProcessing(true);
      clearRecentScan(); // avoid duplicate state issues
      navigate(`/list/${currentList.id}`);
    } catch (error: any) {
      console.error("❌ SAVE ERROR:", error);
      setScanError(error.message || 'Failed to save item');
      alert(`❌ Save Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
