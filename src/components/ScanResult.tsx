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

export const ScanResult: React.FC<ScanResultProps> = ({
  item,
  isLoading,
  onSave,
  onClear,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // reset form when a new item is scanned
    setQuantity(1);
    setNotes('');
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    onSave({ quantity, notes });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      {/* ⚡ Removed duplicate item details — overlay already shows it */}

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
          onChange={(e) =>
            setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
          }
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
          {isLoading ? 'Saving...' : <><Save className="h-5 w-5 mr-2" /> Save to List</>}
        </button>
      </div>
    </div>
  );
};
