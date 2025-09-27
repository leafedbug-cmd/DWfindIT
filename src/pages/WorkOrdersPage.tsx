// src/pages/WorkOrdersPage.tsx
import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../store/authStore";
import { X, Scan, Save } from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";

type AnyRow = Record<string, any>;

function pick<T = string>(row: AnyRow | null, keys: string[], fallback: T | "" = ""): T | "" {
  if (!row) return fallback;
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k] as T;
  }
  return fallback;
}

// FIXED: Added 'export' to make this a named export, which fixes the build error.
export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);
  const [row, setRow] = useState<AnyRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // manual fields
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [instructions, setInstructions] = useState("");

  const display = {
    manufacturer: pick(row, ["manufacturer", "make"]),
    model: pick(row, ["model"]),
    serial: pick(row, ["serial_number", "sn"]),
    stock: pick(row, ["stock_number"]),
    hourmeter: pick<number | string>(row, ["hour_meter", "hours"], "")
  };

  const handleScanSuccess = async (barcode: string) => {
    try {
      setErr(null);
      let res = await supabase.from("equipment").select("*").eq("stock_number", barcode).maybeSingle();
      if (!res.data) {
        res = await supabase.from("equipment").select("*").eq("serial_number", barcode).maybeSingle();
      }
      
      if (res.error) throw res.error;
      if (!res.data) throw new Error(`No equipment found for code: ${barcode}`);

      setRow(res.data as AnyRow);
      setIsScanning(false); // Close the scanner modal on success
    } catch (e: any) {
      setErr(e?.message ?? "Lookup failed");
    }
  };

  const handleSave = async () => {
    setErr(null);
    setOk(null);
    if (!user?.id) { setErr("Not signed in."); return; }
    if (!row) { setErr("No equipment has been scanned."); return; }
    if (!instructions && !contactName && !contactPhone) {
      setErr("Add at least one detail (instructions, name or phone).");
      return;
    }

    try {
      setSaving(true);
      
      const workOrderData = {
        user_id: user.id,
        equipment_stock_number: row.stock_number,
        customer_number: row.customer_number || null,
        store_location: row.store_location || null,
        description: `Work order for ${display.manufacturer} ${display.model}. Contact: ${contactName}`,
        status: "Open",
        // These fields will come from your manual input form
        // You would need to add columns to your 'work_orders' table for these
        // contact_name: contactName || null,
        // contact_phone: contactPhone || null,
        // job_location: jobLocation || null,
        // instructions: instructions || null,
      };

      const { error } = await supabase.from("work_orders").insert(workOrderData);

      if (error) throw error;

      setOk("Work order saved!");
      // Reset form after successful save
      setRow(null);
      setContactName("");
      setContactPhone("");
      setJobLocation("");
      setInstructions("");
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
            disabled={saving || !row}
            aria-busy={saving}
            title="Save work order"
          >
            <Save size={18} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Manufacturer" value={display.manufacturer} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Model" value={display.model} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Serial #" value={display.serial} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Stock #" value={display.stock} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Hourmeter" value={display.hourmeter ?? ""} readOnly />
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
              Point the camera at the equipment barcode (stock or serial).
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};