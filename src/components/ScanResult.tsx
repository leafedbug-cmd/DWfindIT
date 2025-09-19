// src/components/ScanResult.tsx
import React, { useState, useEffect } from 'react';
import { UnifiedScanResult } from '../pages/ScanPage';
import { Hash, Pencil, Save, X } from 'lucide-react';

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
    if (item) {
      setQuantity(1);
      setNotes('');
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    onSave({ quantity, notes });
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border space-y-3">
      {/* Quantity Controls */}
      <div className="flex items-center space-x-3">
        <Hash className="h-4 w-4 text-gray-400" />
        <label htmlFor="quantity" className="font-medium text-gray-700 text-sm">
          Quantity
        </label>
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100"
          >
            −
          </button>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-14 text-center border-x outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Notes Input */}
      <div className="flex items-start space-x-2">
        <Pencil className="h-4 w-4 text-gray-400 mt-2" />
        <textarea
          placeholder="Add notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded-md text-sm"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onClear}
          className="flex-1 flex items-center justify-center p-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
        >
          <X className="h-4 w-4 mr-1" /> Clear
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center p-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Saving…' : <><Save className="h-4 w-4 mr-1" /> Save</>}
        </button>
      </div>
    </div>
  );
};
