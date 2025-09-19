// src/pages/ScanPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanResult } from '../components/ScanResult';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../services/supabase';
import { Package, Tag } from 'lucide-react';

export interface UnifiedScanResult {
  type: 'part' | 'equipment';
  id: string;                       // part.id or equipment.stock_number
  primaryIdentifier: string;        // part_number or stock_number
  secondaryIdentifier: string;      // bin_location or make/model
  barcode: string;
  store_location: string;
  description?: string | null;
  equipmentDetails?: {
    customer_name?: string | null;
    model?: string | null;
    make?: string | null;
    serial_number?: string | null;
    invoice_number?: string | null;
    branch?: string | null;
    model_year?: string | number | null;
    internal_unit_y_or_n?: string | boolean | null;
  };
}

export const ScanPage: React.FC = () => {
  const { selectedStore } = useStore();
  const navigate = useNavigate();

  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { addItem, error: itemError, isLoading: isItemLoading } = useScanItemStore();

  // URL params
  const [params] = useSearchParams();
  const preselectListId = params.get('list');
  const autoStart = params.get('auto') === '1';

  // UI state
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<UnifiedScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // --- Scan handler (parts first, then equipment by stock OR serial) ---
  const handleScan = useCallback(
    async (barcode: string) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setScanError(null);
      setScanSuccess(null);

      try {
        // 1) parts (scoped to store)
        const { data: partData, error: partError } = await supabase
          .from('parts')
          .select('*')
          .eq('part_number', barcode)
          .eq('store_location', selectedStore)
          .maybeSingle();

        if (partError) throw partError;

        if (partData) {
          setScanSuccess(`Part Found: ${partData.part_number}`);
          setLastScannedItem({
            type: 'part',
            id: partData.id,
            primaryIdentifier: partData.part_number,
            secondaryIdentifier: partData.bin_location,
            barcode,
            store_location: partData.store_location,
            description: partData.description,
          });
          return;
        }

        // 2) equipment (NOT store-limited) — match stock_number OR serial_number
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select('*')
          .or(`stock_number.eq.${barcode},serial_number.eq.${barcode}`)
          .maybeSingle();

        if (equipmentError) throw equipmentError;

        if (equipmentData) {
          setScanSuccess(
            `Equipment Found: ${equipmentData.stock_number}${
              equipmentData.serial_number ? ` (SN: ${equipmentData.serial_number})` : ''
            }`
          );
          setLastScannedItem({
            type: 'equipment',
            id: equipmentData.stock_number,
            primaryIdentifier: equipmentData.stock_number,
            secondaryIdentifier: `${equipmentData.make || ''} ${equipmentData.model || ''}`.trim(),
            barcode,
            store_location: equipmentData.store_location ?? equipmentData.branch ?? 'N/A',
            description: equipmentData.description,
            equipmentDetails: {
              customer_name: equipmentData.customer_name ?? null,
              model: equipmentData.model ?? null,
              make: equipmentData.make ?? null,
              serial_number: equipmentData.serial_number ?? null,
              invoice_number: equipmentData.invoice_number ?? null,
              branch: (equipmentData.branch ?? equipmentData.store_location) ?? null,
              model_year: equipmentData.model_year ?? null,
              internal_unit_y_or_n: equipmentData.internal_unit_y_or_n ?? null,
            },
          });
          return;
        }

        // Not found anywhere
        throw new Error(
          `Item "${barcode}" not found in parts (store ${selectedStore}) or equipment (by stock # or serial #).`
        );
      } catch (err) {
        console.error('Scan processing error:', err);
        setScanError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, selectedStore]
  );

  // Save to list (manual qty from ScanResult)
  const handleSaveItem = async (updates: { quantity: number; notes: string }) => {
    if (!lastScannedItem) {
      setScanError('Nothing to save yet — scan an item first.');
      return;
    }
    if (!currentList && !preselectListId) {
      setScanError('No list selected. Create or choose a list to save items.');
      return;
    }

    const targetListId = preselectListId ?? currentList!.id;
    const targetList =
      (preselectListId ? lists.find((l) => l.id === preselectListId) : currentList) ?? null;
    const targetListName = targetList?.name ?? `List ${targetListId}`;

    const newItemData = {
      list_id: targetListId,
      barcode: lastScannedItem.barcode,
      part_number: lastScannedItem.primaryIdentifier, // stock_number for equipment
      bin_location: lastScannedItem.type === 'part' ? lastScannedItem.secondaryIdentifier : 'N/A',
      store_location: lastScannedItem.store_location ?? 'N/A',
      quantity: updates.quantity,
      notes: updates.notes,
    };

    const addedItem = await addItem(newItemData);

    if (addedItem) {
      setScanSuccess(`Added ${updates.quantity} "${newItemData.part_number}" to "${targetListName}" ✅`);
      setLastScannedItem(null);
      setTimeout(() => setScanSuccess(null), 3000);
    }
  };

  // overlay summary inside camera preview
  const overlayCard = useMemo(() => {
    if (!lastScannedItem) return null;

    const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
      !value ? null : (
        <div className="flex items-baseline justify-between gap-3 text-[11px] sm:text-xs px-3 py-1">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900 text-right">{String(value)}</span>
        </div>
      );

    const badge =
      lastScannedItem.type === 'part' ? (
        <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
          <Package className="h-3 w-3 mr-1" /> Part
        </span>
      ) : (
        <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800">
          <Tag className="h-3 w-3 mr-1" /> Equipment
        </span>
      );

    return (
      <div className="p-1.5">
        <div className="flex items-center justify-between px-3 pt-1.5">{badge}</div>
        {lastScannedItem.type === 'part' ? (
          <>
            <Row label="Part Number" value={lastScannedItem.primaryIdentifier} />
            <Row label="Bin Location" value={lastScannedItem.secondaryIdentifier} />
          </>
        ) : (
          <>
            <Row label="Stock #" value={lastScannedItem.primaryIdentifier} />
            <Row label="Serial #" value={lastScannedItem.equipmentDetails?.serial_number ?? undefined} />
            <Row label="Branch" value={lastScannedItem.equipmentDetails?.branch ?? undefined} />
          </>
        )}
      </div>
    );
  }, [lastScannedItem]);

  // slim status “toasts”
  const StatusPills = (
    <div className="space-y-1">
      {cameraError && (
        <p className="inline-flex items-center px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
          {cameraError}
        </p>
      )}
      {(scanError || itemError) && (
        <p className="inline-flex items-center px-2 py-1 text-xs rounded bg-red-100 text-red-800">
          {scanError || itemError}
        </p>
      )}
      {scanSuccess && (
        <p className="inline-flex items-center px-2 py-1 text-xs rounded bg-green-100 text-green-800">
          {scanSuccess}
        </p>
      )}
    </div>
  );

  // hook up camera error
  const handleCameraError = useCallback((err: string) => setCameraError(err), []);

  // load lists
  useEffect(() => {
    if (lists.length === 0) fetchLists();
  }, [lists.length, fetchLists]);

  // if list=... present, prefer it; otherwise leave selection alone
  useEffect(() => {
    if (lists.length === 0) return;
    if (preselectListId) {
      const match = lists.find((l) => l.id === preselectListId);
      if (match && (!currentList || currentList.id !== match.id)) {
        setCurrentList?.(match);
      }
    }
  }, [lists, currentList, setCurrentList, preselectListId]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Scan Item" showBackButton />

      <main className="flex-1 p-3 space-y-3">
        {/* saving target hint */}
        {currentList ? (
          <div className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded w-fit">
            Saving to: <span className="font-medium">{currentList.name}</span>
          </div>
        ) : (
          <div className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-fit">
            No list selected — scans work, but you’ll need a list to{' '}
            <button className="underline font-medium" onClick={() => navigate('/lists')}>save</button>.
          </div>
        )}

        {/* camera with overlay */}
        <BarcodeScanner
          autoStart={autoStart}
          overlay={overlayCard}
          onScanSuccess={handleScan}
          onScanError={handleCameraError}
        />

        {StatusPills}

        {/* compact controls (quantity / save / clear) */}
        <ScanResult
          item={lastScannedItem}
          isLoading={isProcessing || isItemLoading}
          onSave={handleSaveItem}
          onClear={() => {
            setLastScannedItem(null);
            setScanError(null);
            setScanSuccess(null);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
};
