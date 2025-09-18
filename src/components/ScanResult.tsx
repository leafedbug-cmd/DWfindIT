// src/components/ScanResult.tsx
import React, { useEffect, useRef, useState } from 'react';
import { UnifiedScanResult } from '../pages/ScanPage';
import { ChevronDown, ChevronUp, Minus, Plus, Save, X, Pencil } from 'lucide-react';

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
  const [qty, setQty] = useState<number>(1);
  const [qtyText, setQtyText] = useState('1');
  const [notes, setNotes] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const qtyRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // reset when new scan arrives
    setQty(1);
    setQtyText('1');
    setNotes('');
    setShowExtras(false);
    setTimeout(() => qtyRef.current?.focus(), 50);
  }, [item]);

  if (!item) return null;

  const commitQty = (textVal: string) => {
    const n = textVal === '' ? 1 : Math.max(1, parseInt(textVal, 10) || 1);
    setQty(n);
    setQtyText(String(n));
  };
  const dec = () => { const n = Math.max(1, qty - 1); setQty(n); setQtyText(String(n)); };
  const inc = () => { const n = qty + 1; setQty(n); setQtyText(String(n)); };

  const handleSave = () => onSave({ quantity: qty, notes });

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border space-y-2">
      {/* one-line primary controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Qty</span>

        <div className="flex items-center rounded-md border overflow-hidden">
          <button type="button" onClick={dec} className="px-2 py-2 text-gray-700 hover:bg-gray-100">
            <Minus className="h-4 w-4" />
          </button>
          <input
            ref={qtyRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value.replace(/\D/g, ''))}
            onBlur={() => commitQty(qtyText)}
            className="w-12 text-center outline-none border-l border-r py-2"
          />
          <button type="button" onClick={inc} className="px-2 py-2 text-gray-700 hover:bg-gray-100">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-2 text-white font-semibold hover:bg-orange-700 disabled:bg-gray-400"
        >
          <Save className="h-4 w-4" /> {isLoading ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-300"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>

      {/* collapsible extras: notes only (keeps layout short) */}
      <button
        type="button"
        onClick={() => setShowExtras(v => !v)}
        className="w-full flex items-center justify-between text-sm text-gray-600"
      >
        <span className="inline-flex items-center gap-2">
          <Pencil className="h-4 w-4" /> Notes (optional)
        </span>
        {showExtras ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showExtras && (
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes…"
          className="w-full rounded-md border p-2 text-sm"
        />
      )}
    </div>
  );
};
