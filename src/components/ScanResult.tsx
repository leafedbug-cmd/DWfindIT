// src/components/ScanResult.tsx
import React, { useState, useEffect } from 'react';
import { UnifiedScanResult } from '../pages/ScanPage';
import { Pencil, Save, X, Minus, Plus } from 'lucide-react';

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
  // keep both number and text so users can clear/backspace freely
  const [quantity, setQuantity] = useState<number>(1);
  const [qtyText, setQtyText] = useState<string>('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // reset form when a new item is scanned
    setQuantity(1);
    setQtyText('1');
    setNotes('');
  }, [item]);

  if (!item) return null;

  const commitQty = (textVal: string) => {
    const n = textVal === '' ? 1 : Math.max(1, parseInt(textVal, 10) || 1);
    setQuantity(n);
    setQtyText(String(n));
  };

  const decrement = () => {
    const next = Math.max(1, quantity - 1);
    setQuantity(next);
    setQtyText(String(next));
  };

  const increment = () => {
    const next = quantity + 1;
    setQuantity(next);
    setQtyText(String(next));
  };

  const handleSave = () => onSave({ quantity, notes });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      {/* Quantity with +/- and easy typing */}
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="font-medium text-gray-700">
          Quantity
        </label>

        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={decrement}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            id="quantity"
            // text + inputMode to allow backspace/empty and show 10-key keypad
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-16 p-2 text-center border-l border-r outline-none"
            value={qtyText}
            onChange={(e) => {
              // keep only digits; allow empty while typing
              const digits = e.target.value.replace(/\D/g, '');
              setQtyText(digits);
            }}
            onBlur={() => commitQty(qtyText)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            placeholder="1"
          />

          <button
            type="button"
            onClick={increment}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="flex items-start gap-2">
        <Pencil className="h-5 w-5 text-gray-400 mt-2" />
        <textarea
          placeholder="Add notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onClear}
          className="flex-1 flex items-center justify-center p-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          type="button"
        >
          <X className="h-5 w-5 mr-2" /> Clear
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center p-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400"
          disabled={isLoading}
          type="button"
        >
          {isLoading ? 'Saving...' : (<><Save className="h-5 w-5 mr-2" /> Save to List</>)}
        </button>
      </div>
    </div>
  );
};
