// src/pages/WorkOrdersPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../store/authStore";
import { X, Scan, Save, Eraser } from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { useStore } from "../contexts/StoreContext";
import { useWorkOrderStore, WorkOrderWithEquipment } from "../store/workOrderStore";
import { generateWorkOrderPDF } from "../utils/workOrderExport";
import SignatureCanvas from 'react-signature-canvas';

type EquipmentRow = {
  id?: number;
  make?: string | null;
  model?: string | null;
  serial_number?: string | null;
  stock_number?: string | null;
  hour_meter?: string | null;
  hours?: string | null;
  customer_number?: string | null;
  store_location?: string | null;
};

type EquipmentFormState = {
  manufacturer: string; model: string; serial: string; stock: string; hourmeter: string;
  scannedData: EquipmentRow | null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
};

const fetchEquipmentByField = (column: 'stock_number' | 'serial_number', value: string) =>
  supabase.from<EquipmentRow>('equipment').select('*').eq(column, value).maybeSingle();

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedStore } = useStore();
  const { workOrders, isLoading: isLoadingWorkOrders, fetchWorkOrders } = useWorkOrderStore();

  const [isScanning, setIsScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [equipmentForm, setEquipmentForm] = useState<EquipmentFormState>({
    manufacturer: "", model: "", serial: "", stock: "", hourmeter: "", scannedData: null,
  });

  const [customerNumber, setCustomerNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [instructions, setInstructions] = useState("");
  const [winterizationRequired, setWinterizationRequired] = useState(false);

  const sigPad = useRef<SignatureCanvas>(null);
  
  useEffect(() => {
    if (user) {
        fetchWorkOrders(user.id);
    }
  }, [user, fetchWorkOrders]);

  const handleFormChange = (field: keyof EquipmentFormState, value: string) => {
    setEquipmentForm(prev => ({ ...prev, [field]: value }));
  };
  
  const resetAllFields = () => {
      setEquipmentForm({ manufacturer: "", model: "", serial: "", stock: "", hourmeter: "", scannedData: null });
      setCustomerNumber("");
      setContactName("");
      setContactPhone("");
      setJobLocation("");
      setInstructions("");
      setWinterizationRequired(false);
      sigPad.current?.clear();
      setOk(null);
      setErr(null);
  };

  const handleScanSuccess = async (barcode: string) => {
    try {
      setErr(null);
      let response = await fetchEquipmentByField('stock_number', barcode);
      if (!response.data) {
        response = await fetchEquipmentByField('serial_number', barcode);
      }
      if (response.error) throw response.error;
      if (!response.data) {
        throw new Error(`No equipment found for code: ${barcode}. Please enter details manually.`);
      }

      const equipment = response.data;
      setEquipmentForm({
        manufacturer: equipment.make ?? "",
        model: equipment.model ?? "",
        serial: equipment.serial_number ?? "",
        stock: equipment.stock_number ?? "",
        hourmeter: equipment.hour_meter ?? equipment.hours ?? "",
        scannedData: equipment,
      });
      setCustomerNumber(equipment.customer_number ?? "");
      setIsScanning(false);
    } catch (error) {
      setErr(getErrorMessage(error, "Lookup failed"));
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    setErr(null);
    setOk(null);
    if (!user?.id) { setErr("Not signed in."); return; }
    if (!equipmentForm.stock && !equipmentForm.serial) { setErr("A Stock # or Serial # is required."); return; }
    if (sigPad.current?.isEmpty()) { setErr("A signature is required to authorize the repair."); return; }

    try {
      setSaving(true);

      const signatureImage = sigPad.current?.toDataURL();

      const normalize = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        return String(value).trim();
      };

      const scanned = equipmentForm.scannedData ?? {};

      const equipmentSnapshot = {
        manufacturer: normalize(equipmentForm.manufacturer) || normalize(scanned.make),
        model: normalize(equipmentForm.model) || normalize(scanned.model),
        serial: normalize(equipmentForm.serial) || normalize(scanned.serial_number),
        stock: normalize(equipmentForm.stock) || normalize(scanned.stock_number),
        hourmeter: normalize(equipmentForm.hourmeter) || normalize(scanned.hour_meter) || normalize(scanned.hours),
      };
      const equipmentSummary = [equipmentSnapshot.manufacturer, equipmentSnapshot.model].filter(Boolean).join(" ").trim();
      const workOrderLabel = equipmentSummary || "Equipment";

      const trimmedCustomerNumber = normalize(customerNumber);
      const trimmedContactName = normalize(contactName);
      const trimmedContactPhone = normalize(contactPhone);
      const trimmedJobLocation = normalize(jobLocation);
      const trimmedInstructions = normalize(instructions);

      const workOrderData = {
        user_id: user.id,
        equipment_stock_number: equipmentForm.scannedData?.stock_number || equipmentSnapshot.stock || null,
        customer_number: trimmedCustomerNumber || null,
        store_location: selectedStore,
        description: `Work order for ${workOrderLabel}`,
        status: "Open",
        contact_name: trimmedContactName || null,
        contact_phone: trimmedContactPhone || null,
        job_location: trimmedJobLocation || null,
        instructions: trimmedInstructions || null,
        winterization_required: winterizationRequired,
        signature: signatureImage,
      };

      const { data: savedData, error } = await supabase.from("work_orders").insert(workOrderData).select().single();

      if (error || !savedData) throw error || new Error("Failed to get response after saving.");

      const pdfWorkOrderData = {
        id: savedData.id,
        created_at: savedData.created_at,
        customer_number: trimmedCustomerNumber,
        contact_name: trimmedContactName,
        contact_phone: trimmedContactPhone,
        job_location: trimmedJobLocation,
        instructions: trimmedInstructions,
        winterization_required: winterizationRequired,
        store_location: selectedStore ?? "",
        signature: signatureImage,
      };

      await generateWorkOrderPDF(pdfWorkOrderData, equipmentSnapshot);
      setOk("Work order saved and PDF downloaded!");
      
      const stockLabel = equipmentSnapshot.stock || "Manual Entry";
      const subject = `New Work Order for ${workOrderLabel}`;
      const body = `A new work order has been created for ${workOrderLabel} (Stock: ${stockLabel}).\n\nPlease find the PDF (downloaded to your device) and attach it to this email.`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      resetAllFields();
      if (user) fetchWorkOrders(user.id);

    } catch (error) {
      setErr(getErrorMessage(error, "Failed to save work order"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-16 text-gray-900 dark:text-gray-100">
      <Header title="Work Orders" />
      <main className="p-4 pb-6 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex gap-3">
              <button className="px-3 py-2 rounded bg-black text-white flex items-center gap-2" onClick={() => setIsScanning(true)}>
                <Scan size={18}/> Scan Equipment
              </button>
              <button className="px-3 py-2 rounded bg-orange-600 text-white flex items-center gap-2 disabled:opacity-60" onClick={handleSave} disabled={saving}>
                <Save size={18} /> {saving ? "Saving…" : "Save"}
              </button>
              <button className="px-3 py-2 rounded bg-gray-500 text-white flex items-center gap-2 ml-auto" onClick={resetAllFields}>
                <Eraser size={18} /> Clear
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Manufacturer" value={equipmentForm.manufacturer} onChange={e => handleFormChange('manufacturer', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Model" value={equipmentForm.model} onChange={e => handleFormChange('model', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Serial #" value={equipmentForm.serial} onChange={e => handleFormChange('serial', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Stock #" value={equipmentForm.stock} onChange={e => handleFormChange('stock', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Hourmeter" value={equipmentForm.hourmeter} onChange={e => handleFormChange('hourmeter', e.target.value)} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Customer Number" value={customerNumber} onChange={e=>setCustomerNumber(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Contact Phone" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100" placeholder="Store Location" value={selectedStore} readOnly />
              <input className="w-full px-3 py-2 rounded border bg-white md:col-span-2 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Job Location (optional)" value={jobLocation} onChange={e=>setJobLocation(e.target.value)} />
              <textarea className="w-full px-3 py-2 rounded border bg-white md:col-span-2 h-28 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100" placeholder="Instructions" value={instructions} onChange={e=>setInstructions(e.target.value)} />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <label className="flex items-center space-x-3">
                    <input type="checkbox" checked={winterizationRequired} onChange={(e) => setWinterizationRequired(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"/>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Winterization Required? <span className="text-red-500">*</span></span>
                </label>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    If machine is marked as winterized above, Ditch Witch of Arkansas will not be responsible for any damage to machine from freezing. If Ditch Witch Of Arkansas is required to winterize machine an extra charge will be applied to Work Order.
                </p>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Repair Authorization & Signature</h3>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    I hereby authorize the repair work described above...
                </p>
                <div className="mt-4 border border-gray-300 rounded-lg dark:border-slate-700">
                    <SignatureCanvas 
                        ref={sigPad}
                        penColor='black'
                        canvasProps={{ className: 'w-full h-32' }} 
                    />
                </div>
                <button 
                    onClick={() => sigPad.current?.clear()}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                >
                    Clear Signature
                </button>
            </div>

            {ok && <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded dark:bg-green-900/40 dark:border-green-700/40 dark:text-green-200">{ok}</div>}
            {err && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900/40 dark:border-red-700/40 dark:text-red-200">{err}</div>}
        </div>
        
        <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-800 pt-4 dark:text-gray-100">My Recent Work Orders</h2>
            {isLoadingWorkOrders ? (
                <p className="text-center text-gray-500 dark:text-gray-300">Loading work orders...</p>
            ) : workOrders.length > 0 ? (
                workOrders.map((wo: WorkOrderWithEquipment) => (
                    <div key={wo.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                       {/* ... work order list item display ... */}
                    </div>
                ))
            ) : (
                <p className="text-center text-gray-500 bg-white p-4 rounded-lg border dark:text-gray-300 dark:bg-slate-800 dark:border-slate-700">No work orders found.</p>
            )}
        </div>
      </main>

      {/* FIXED: The invalid comment has been replaced with the full modal code */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 dark:bg-slate-900">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scan Equipment</h3>
              <button onClick={() => setIsScanning(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                <X className="h-6 w-6" />
              </button>
            </div>
            <BarcodeScanner 
                onScanSuccess={(text) => handleScanSuccess(text)} 
                onScanError={(msg) => setErr(msg)}
            />
            <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
              Point the camera at the equipment barcode.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
