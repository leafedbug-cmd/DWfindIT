// src/pages/WorkOrdersPage.tsx
import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../store/authStore";
import { X, Scan, Save, Eraser } from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";

// ADDED: A specific type for our form data
type EquipmentFormState = {
  manufacturer: string;
  model: string;
  serial: string;
  stock: string;
  hourmeter: string;
  // This will hold the original scanned row if it exists
  scannedData: Record<string, any> | null;
};

// This helper is no longer needed with the new state management
// function pick(...)

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ADDED: State to manage the equipment form fields
  const [equipmentForm, setEquipmentForm] = useState<EquipmentFormState>({
    manufacturer: "",
    model: "",
    serial: "",
    stock: "",
    hourmeter: "",
    scannedData: null,
  });

  // manual contact fields
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [instructions, setInstructions] = useState("");

  // Function to update a single field in the equipment form
  const handleFormChange = (field: keyof EquipmentFormState, value: string) => {
    setEquipmentForm(prev => ({ ...prev, [field]: value }));
  };
  
  // Function to reset all fields
  const resetAllFields = () => {
      setEquipmentForm({ manufacturer: "", model: "", serial: "", stock: "", hourmeter: "", scannedData: null });
      setContactName("");
      setContactPhone("");
      setJobLocation("");
      setInstructions("");
      setOk(null);
      setErr(null);
  };

  const handleScanSuccess = async (barcode: string) => {
    try {
      setErr(null);
      let res = await supabase.from("equipment").select("*").eq("stock_number", barcode).maybeSingle();
      if (!res.data) {
        res = await supabase.from("equipment").select("*").eq("serial_number", barcode).maybeSingle();
      }
      
      if (res.error) throw res.error;
      if (!res.data) throw new Error(`No equipment found for code: ${barcode}. Please enter details manually.`);

      // Populate the form with the scanned data
      setEquipmentForm({
        manufacturer: res.data.make || "",
        model: res.data.model || "",
        serial: res.data.serial_number || "",
        stock: res.data.stock_number || "",
        hourmeter: res.data.hour_meter || res.data.hours || "",
        scannedData: res.data,
      });

      setIsScanning(false); // Close the scanner modal on success
    } catch (e: any) {
      setErr(e?.message ?? "Lookup failed");
      setIsScanning(false); // Also close scanner on failure to allow manual entry
    }
  };

  const handleSave = async () => {
    setErr(null);
    setOk(null);
    if (!user?.id) { setErr("Not signed in."); return; }
    // CHANGED: Validate that a key equipment field is filled, not just that something was scanned
    if (!equipmentForm.stock && !equipmentForm.serial) {
      setErr("A Stock # or Serial # is required to create a work order.");
      return;
    }
    if (!instructions && !contactName && !contactPhone) {
      setErr("Add at least one detail (instructions, name or phone).");
      return;
    }

    try {
      setSaving(true);
      
      const workOrderData = {
        user_id: user.id,
        // If equipment was scanned, link it. Otherwise, this will be null.
        equipment_stock_number: equipmentForm.scannedData?.stock_number || null,
        // Save all the other details, whether scanned or manually entered
        description: `Work order for ${equipmentForm.manufacturer} ${equipmentForm.model}. Contact: ${contactName}. Details: ${instructions}`,
        status: "Open",
        // You would need to add columns to your 'work_orders' table for these to be saved
        // customer_number: equipmentForm.scannedData?.customer_number || null,
        // store_location: equipmentForm.scannedData?.store_location || null,
      };

      const { error } = await supabase.from("work_orders").insert(workOrderData);

      if (error) throw error;

      setOk("Work order saved!");
      resetAllFields();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save work order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Work Orders" />
      <main className="p-4 pb-6 space-y-4">
        <div className="flex gap-3">
          <button
            className="px-3 py-2 rounded bg-black text-white flex items-center gap-2"
            onClick={() => setIsScanning(true)}
          >
            <Scan size={18}/> Scan Equipment
          </button>

          <button
            className="px-3 py-2 rounded bg-orange-600 text-white flex items-center gap-2 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
            title="Save work order"
          >
            <Save size={18} />
            {saving ? "Saving…" : "Save"}
          </button>
          
          {/* ADDED: A button to clear all fields */}
          <button
            className="px-3 py-2 rounded bg-gray-500 text-white flex items-center gap-2 ml-auto"
            onClick={resetAllFields}
            title="Clear all fields"
          >
            <Eraser size={18} />
            Clear
          </button>
        </div>

        {/* CHANGED: All these inputs are now editable */}
        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Manufacturer" value={equipmentForm.manufacturer} onChange={e => handleFormChange('manufacturer', e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Model" value={equipmentForm.model} onChange={e => handleFormChange('model', e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Serial #" value={equipmentForm.serial} onChange={e => handleFormChange('serial', e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Stock #" value={equipmentForm.stock} onChange={e => handleFormChange('stock', e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Hourmeter" value={equipmentForm.hourmeter} onChange={e => handleFormChange('hourmeter', e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Phone" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white md:col-span-2" placeholder="Job Location (optional)" value={jobLocation} onChange={e=>setJobLocation(e.target.value)} />
          <textarea className="w-full px-3 py-2 rounded border bg-white md:col-span-2 h-28" placeholder="Instructions" value={instructions} onChange={e=>setInstructions(e.target.value)} />
        </div>

        {ok && <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded">{ok}</div>}
        {err && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{err}</div>}
      </main>

      {isScanning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Scan Equipment</h3>
              <button onClick={() => setIsScanning(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <BarcodeScanner 
                onScanSuccess={(text) => handleScanSuccess(text)} 
                onScanError={(msg) => setErr(msg)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Point the camera at the equipment barcode (stock or serial). If not found, you can enter the details manually.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};