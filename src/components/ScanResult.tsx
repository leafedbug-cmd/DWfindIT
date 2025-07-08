// src/components/ScanResult.tsx
import React, { useEffect, useState, useCallback, memo } from 'react'
import { CheckCircle, AlertCircle, Package, MapPin, Plus, Minus, Scan } from 'lucide-react'
import type { ScanItem } from '../services/supabase'

interface ScanResultProps {
  item: ScanItem | null
  isLoading?: boolean
  error?: string | null
  onSave?: (updates: Partial<ScanItem>) => void
  clearResult?: () => void
}

export const ScanResult: React.FC<ScanResultProps> = memo(({
  item,
  isLoading = false,
  error = null,
  onSave = () => {},
  clearResult = () => {},
}) => {
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')

  // Debug log to trace props (only log when values actually change)
  useEffect(() => {
    console.log('🔎 ScanResult render →', { item: !!item, isLoading, error: !!error })
  }, [item, isLoading, error])

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity || 1)
      setNotes(item.notes || '')
    }
  }, [item])

  const handleSave = useCallback(() => {
    console.log('💾 ScanResult save →', { quantity, notes })
    onSave({ quantity, notes })
  }, [quantity, notes, onSave])

  const handleCancel = useCallback(() => {
    console.log('❌ ScanResult clear')
    clearResult()
  }, [clearResult])

  const incrementQuantity = useCallback(() => {
    setQuantity(prev => prev + 1)
  }, [])

  const decrementQuantity = useCallback(() => {
    setQuantity(prev => Math.max(1, prev - 1))
  }, [])

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 bg-white rounded-lg shadow-md">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-center">
        <AlertCircle className="mx-auto mb-2 text-red-600 h-6 w-6" />
        <h3 className="text-md font-medium text-red-800">Scan Error</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <Scan className="mx-auto mb-2 text-gray-400 h-12 w-12" />
        <p className="text-gray-500">Scan a barcode to see details</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-green-50 p-3 border-b border-green-100 flex items-center">
        <CheckCircle className="text-green-600 h-5 w-5 mr-2" />
        <span className="text-green-800 font-medium">Successfully Scanned</span>
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Barcode</p>
          <p className="font-mono text-sm bg-gray-50 p-2 rounded">{item.barcode}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center mb-1">
              <Package className="h-4 w-4 text-orange-600 mr-1" />
              <p className="text-xs text-gray-500">Part Number</p>
            </div>
            <p className="font-medium">{item.part_number}</p>
          </div>
          
          <div>
            <div className="flex items-center mb-1">
              <MapPin className="h-4 w-4 text-orange-600 mr-1" />
              <p className="text-xs text-gray-500">Bin Location</p>
            </div>
            <p className="font-medium">{item.bin_location}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="quantity" className="block text-xs text-gray-500 mb-1">
            Quantity
          </label>
          <div className="flex items-center">
            <button 
              onClick={decrementQuantity}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-l-md border border-gray-300"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center py-2 border-t border-b border-gray-300 focus:ring-orange-500 focus:border-orange-500"
              min="1"
            />
            <button 
              onClick={incrementQuantity}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-r-md border border-gray-300"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="notes" className="block text-xs text-gray-500 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            rows={2}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
          >
            Save to List
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
})

// Add display name for debugging
ScanResult.displayName = 'ScanResult'