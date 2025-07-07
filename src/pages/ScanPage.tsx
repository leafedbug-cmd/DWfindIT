// src/pages/ScanPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { ScanResult } from '../components/ScanResult'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { useListStore } from '../store/listStore'
import { useScanItemStore } from '../store/scanItemStore'
import { useStore } from '../contexts/StoreContext'

export const ScanPage: React.FC = () => {
  const navigate = useNavigate()
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScannedPart, setLastScannedPart] = useState<any>(null)

  const { lists, fetchLists, currentList, setCurrentList } = useListStore()
  const { recentScan, addItem, clearRecentScan, isLoading: isItemLoading } = useScanItemStore()
  const { selectedStore, isLoading: isStoreLoading } = useStore()

  // load available lists on mount
  useEffect(() => {
    if (!lists.length) fetchLists()
  }, [lists, fetchLists])

  // pick a default list
  useEffect(() => {
    if (lists.length > 0 && !currentList) {
      setCurrentList(lists[0])
    }
  }, [lists, currentList, setCurrentList])

  // handle a successful barcode scan
  const handleScan = async (barcode: string) => {
    if (isProcessing) return
    setScanError(null)
    setScanSuccess(null)
    setLastScannedPart(null)
    setIsProcessing(true)

    try {
      const { data: partData, error: partError } = await supabase
        .from('parts')
        .select('*')
        .eq('part_number', barcode)
        .eq('store_location', selectedStore)
        .single()

      if (partError || !partData) {
        throw new Error(`Part "${barcode}" not found in your store (${selectedStore}).`)
      }

      setLastScannedPart(partData)
      setScanSuccess(`${barcode} → Bin: ${partData.bin_location}`)
      setTimeout(() => setScanSuccess(null), 5000)
    } catch (err: any) {
      console.error('Scan error:', err)
      setScanError(err.message || 'Failed to process scan')
      setTimeout(() => setScanError(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  // handle scanner errors
  const handleScanError = (error: string) => {
    setScanError(error)
    setTimeout(() => setScanError(null), 3000)
  }

  // save modified scan item
  const handleSaveItem = async (updates: any) => {
    if (!lastScannedPart || !currentList) return
    setIsProcessing(true)
    try {
      await addItem({
        barcode: lastScannedPart.part_number,
        part_number: lastScannedPart.part_number,
        bin_location: lastScannedPart.bin_location,
        list_id: currentList.id,
        quantity: updates.quantity || 1,
        notes: updates.notes || ''
      })
      setScanSuccess(`Added ${lastScannedPart.part_number} to list`)
      setTimeout(() => setScanSuccess(null), 3000)
    } catch (err: any) {
      setScanError(err.message || 'Failed to save item')
      setTimeout(() => setScanError(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isStoreLoading) {
    return <p className="p-4 text-center">Loading your store settings...</p>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Scan Barcode" showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Error / Success banners */}
        {scanError && (
          <div className="p-2 bg-red-100 text-red-800 rounded">{scanError}</div>
        )}
        {scanSuccess && (
          <div className="p-2 bg-green-100 text-green-800 rounded">{scanSuccess}</div>
        )}

        {/* Camera Scanner */}
        <BarcodeScanner
          onScanSuccess={handleScan}
          onScanError={handleScanError}
        />

        {/* Scan Result Details */}
        <ScanResult
          item={lastScannedPart}
          isLoading={isProcessing || isItemLoading}
          error={scanError}
          onSave={handleSaveItem}
          clearResult={clearRecentScan}
        />
      </main>

      <BottomNav />
    </div>
  )
// Note: This code assumes you have the necessary imports and context setup for supabase and other components.
// Make sure to adjust the supabase queries and context usage according to your actual setup.