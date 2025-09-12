// src/components/ScanResult.tsx
import React, { useState, useEffect } from 'react';
import { UnifiedScanResult } from '../pages/ScanPage';
import { Tag, Package, Hash, Pencil, Save, X, Minus, Plus } from 'lucide-react';

interface ScanResultProps {
  item: UnifiedScanResult | null;
  isLoading: boolean;
  onSave: (updates: { quantity: number; notes: string }) => void;
  onClear: () => void;
}

// tiny helper: render a label/value row only if value exists
function FieldRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '' || value === 'N/A') return null;
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="ml-4 font-medium text-gray-800 text-right">{String(value)}</span>
    </div>
  );
}

function formatInternal(v: string | boolean | null | undefined) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'y' || s === 'yes' || s === 'true') return 'Yes';
    if (s === 'n' || s === 'no' || s === 'false') return 'No';
    return v;
  }
  return v ?? undefined;
}

export const ScanResult: React.FC<ScanResultProps> = ({ item, isLoading, onSave, onClear }) => {
  // Keep a numeric value AND a text value so users can backspace/clear freely.
  const [quantity, setQuantity] = useState<number>(1);
  const [qtyText, setQtyText] = useState<string>('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Reset form when a new item is scanned
    setQuantity(1);
    setQtyText('1');
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

  const eq = item.type === 'equipment' ? item.equipmentDetails ?? {} : {};

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

      {/* Core identifiers */}
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

      {/* Equipment-only extra fields (shown only if present) */}
      {item.type === 'equipment' && (
        <div className="rounded-lg border bg-gray-50 p-3 space-y-1">
          <FieldRow label="Customer" value={eq.customer_name} />
          <FieldRow label="Model" value={eq.model} />
          <FieldRow label="Make" value={eq.make} />
          <FieldRow label="Serial #" value={eq.serial_number} />
          <FieldRow label="Invoice #" value={eq.invoice_number} />
          <FieldRow label="Branch" value={eq.branch} />
          <FieldRow label="Model Year" value={eq.model_year as any} />
          <FieldRow label="Internal Unit" value={formatInternal(eq.internal_unit_y_or_n)} />
        </div>
      )}

      {/* Quantity Input with 10-key keypad + clear/backspace support */}
      <div className="flex items-center gap-2">
        <Hash className="h-5 w-5 text-gray-400" />
        <label htmlFor="quantity" className="font-medium text-gray-700">
          Quantity
        </label>

        <button
          type="button"
          onClick={decrement}
          className="px-3 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          id="quantity"
          type="text"           // allows backspace/empty state
          inputMode="numeric"   // mobile shows 10-key keypad
          pattern="[0-9]*"      // iOS hint for numeric
          className="w-20 p-2 border rounded-md text-center"
          value={qtyText}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            setQtyText(digits);
          }}
          onBlur={() => commitQty(qtyText)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="1"
        />

        <button
          type="button"
          onClick={increment}
          className="px-3 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Notes Input */}
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

      {/* Action Buttons */}
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
