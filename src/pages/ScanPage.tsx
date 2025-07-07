// src/pages/ScanPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { ScanResult } from '../components/ScanResult'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { useStore } from '../contexts/StoreContext'
import { useListStore } from '../store/listStore'
import { useScanItemStore } from '../store/scanItemStore'

export const ScanPage: React.FC = () => {
  const navigate = useNavigate()
  const { selectedStore, isLoading: isStoreLoading } = useStore()
  const { lists, fetchLists, currentList, setCurrentList } = useListStore()
  const { recentScan, addItem, clearRecentScan, isLoading: isAdding } = useScanItemStore()

  const [scanError, setScanError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'view' | 'add'>('view')

  // load your lists & pick one
  useEffect(() => {
    if (lists.length === 0) fetchLists()
  }, [lists, fetchLists])

  useEffect(() => {
    if (lists.length && !currentList) {
      setCurrentList(lists[0])
    }
  }, [lists, currentList, setCurrentList])

  // called by the scanner
  const handleScan = async (barcode: string) => {
    setScanError(null)
    try {
      // if we're in "view" mode just flash it
      if (viewMode === 'view') {
        // no DB call here, ScanResult will just show recentScan
        return
      }
      // otherwise add to the list
      if (!currentList) throw new Error('No list selected')
      const newItem = await addItem({
        barcode,
        part_number: barcode,
        bin_location: '',
        list_id: currentList.id,
        quantity: 1,
        notes: '',
      })
      if (!newItem) {
        throw new Error('Failed to add item')
      }
    } catch (err: any) {
      setScanError(err.message)
    }
  }

  if (isStoreLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading store…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan Barcode" showBackButton />

      <main className="flex-1 p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('view')}
            className={viewMode === 'view' ? 'font-bold' : ''}
          >
            View
          </button>
          <button
            onClick={() => setViewMode('add')}
            className={viewMode === 'add' ? 'font-bold' : ''}
          >
            Add to List
          </button>
        </div>

        <BarcodeScanner
          onScanSuccess={handleScan}
          onScanError={(e) => setScanError(e)}
        />

        {scanError && (
          <div className="p-2 bg-red-100 text-red-700 rounded">{scanError}</div>
        )}

        <ScanResult
          item={recentScan}
          isLoading={isAdding}
          error={scanError}
          clearResult={clearRecentScan}
          onSave={(updates) => {
            if (recentScan) addItem({ ...recentScan, ...updates })
          }}
        />
      </main>

      <BottomNav />
    </div>
  )
}
