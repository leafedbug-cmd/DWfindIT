// src/components/ScanResult.tsx
import React, { useState, useEffect } from 'react';
import type { UnifiedScanResult } from '../pages/ScanPage';
import { Tag, Package, Hash, Pencil, Save, X } from 'lucide-react';

interface ScanResultProps {
  item: UnifiedScanResult | null;
  isLoading: boolean;
  onSave: (updates: { quantity: number; notes: string }) => void;
  onClear: () => void;
}

export const ScanResult: React.FC<ScanResultProps> = ({ item, isLoading, onSave, onClear }) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Reset form when a new item is scanned
    setQuantity(1);
    setNotes('');
  }, [item]);

  if (isLoading && !item) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">Processing scan...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
        <p className="text-gray-500">Point camera at a barcode to begin</p>
      </div>
    );
  }

  const handleSave = () => {
    onSave({ quantity, notes });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      {/* Item Type Indicator */}
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          item.type === 'part' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}
      >
        {item.type === 'part' ? <Package className="h-4 w-4 mr-2" /> : <Tag className="h-4 w-4 mr-2" />}
        {item.type === 'part' ? 'Part' : 'Equipment'}
      </div>

      {/* Item Details */}
      <div>
        <p className="text-sm text-gray-500">{item.type === 'part' ? 'Part Number' : 'Stock Number'}</p>
        <p className="text-xl font-bold text-gray-900">{item.primaryIdentifier}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">{item.type === 'part' ? 'Bin Location' : 'Make/Model'}</p>
        <p className="text-lg font-semibold text-gray-700">{item.secondaryIdentifier}</p>
      </div>
      {item.description && (
        <div>
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-base text-gray-700">{item.description}</p>
        </div>
      )}

      {/* Quantity Input */}
      <div className="flex items-center space-x-2">
        <Hash className="h-5 w-5 text-gray-400" />
        <label htmlFor="quantity" className="font-medium text-gray-700">
          Quantity
        </label>
        <input
          type="number"
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-20 p-2 border rounded-md text-center"
        />
      </div>

      {/* Notes Input */}
      <div className="flex items-start space-x-2">
        <Pencil className="h-5 w-5 text-gray-400 mt-2" />
        <textarea
          placeholder="Add notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onClear}
          className="flex-1 flex items-center justify-center p-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
        >
          <X className="h-5 w-5 mr-2" /> Clear
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center p-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (
            <>
              <Save className="h-5 w-5 mr-2" /> Save to List
            </>
          )}
        </button>
      </div>
    </div>
  );
};