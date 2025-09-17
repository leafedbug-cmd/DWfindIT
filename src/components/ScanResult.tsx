// src/components/ScanResult.tsx
import React, { useState, useEffect, useRef } from 'react';
import { UnifiedScanResult } from '../pages/ScanPage';
import { Pencil, Save, X, Minus, Plus } from 'lucide-react';

interface ScanResultProps {
  item: UnifiedScanResult | null;
  isLoading: boolean;
  onSave: (updates: { quantity: number; notes: string }) => void;
  onClear: () => void;
  /** NEW: if provided, we set quantity to this value (e.g., from a scanned qty barcode) */
  prefillQuantity?: number;
}

export const ScanResult: React.FC<ScanResultProps> = ({
  item,
  isLoading,
  onSave,
  onClear,
  prefillQuantity,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [qtyText, setQtyText] = useState<string>('1');
  const [notes, setNotes] = useState('');

  const qtyInputRef = useRef<HTMLInputElement | null>(null);

  // reset when a new item is scanned
  useEffect(() => {
    setQuantity(1);
    setQtyText('1');
    setNotes('');
    // optional: auto-focus when a new item appears
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  }, [item]);

  // apply prefilled qty coming from a qty barcode
  useEffect(() => {
    if (typeof prefillQuantity === 'number' && prefillQuantity >= 1) {
      setQuantity(prefillQuantity);
      setQtyText(String(prefillQuantity));
    }
  }, [prefillQuantity]);

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
      {/* Quantity */}
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
            ref={qtyInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-16 p-2 text-center border-l border-r outline-none"
            value={qtyText}
            onChange={(e) => {
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
