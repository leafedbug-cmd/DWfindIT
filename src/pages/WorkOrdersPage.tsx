// src/pages/WorkOrdersPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";              // 👈 NEW
import { X, Scan, Save } from "lucide-react";

type AnyRow = Record<string, any>;

function pick<T = string>(row: AnyRow | null, keys: string[], fallback: T | "" = ""): T | "" {
  if (!row) return fallback;
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k] as T;
  }
  return fallback;
}

const WorkOrdersPage: React.FC = () => {
  const { user } = useAuthStore();                               // 👈 NEW
  const [isScanning, setIsScanning] = useState(false);
  const [row, setRow] = useState<AnyRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);             // 👈 NEW success banner

  // manual fields
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [instructions, setInstructions] = useState("");

  const [saving, setSaving] = useState(false);                   // 👈 NEW

  // derived display
  const display = {
    manufacturer: pick(row, ["manufacturer", "make", "brand", "mfr", "vendor_name"], ""),
    model: pick(row, ["model", "model_number", "model_no", "equipment_model"], ""),
    serial: pick(row, ["serial_number", "sn", "serialno", "serial_no"], ""),
    stock: pick(row, ["stock_number", "stock_no", "equipment_number", "unit_no"], ""),
    hourmeter: pick<number | string>(row, ["last_hourmeter", "hourmeter", "hour_meter", "hours"], "")
  };

  // scanner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cleanupScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try { await s.stop(); } catch {}
    try { await s.clear(); } catch {}
    scannerRef.current = null;
  };
  useEffect(() => () => { void cleanupScanner(); }, []);

  const fetchEquipmentByCode = async (codeRaw: string) => {
    const code = codeRaw.trim();
    let res = await supabase.from("equipment").select("*").eq("stock_number", code).maybeSingle();
    if (!res.data) {
      res = await supabase.from("equipment").select("*").eq("serial_number", code).maybeSingle();
    }
    return res;
  };

  const startScan = async () => {
    setErr(null);
    const elId = "wo-scan";
    const el = document.getElementById(elId);
    if (!el) { setErr("Scanner container missing"); return; }

    await cleanupScanner();
    const s = new Html5Qrcode(elId);
    scannerRef.current = s;

    const cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) { setErr("No cameras found"); return; }
    const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) ?? cameras[0];

    await s.start(
      { deviceId: { exact: cam.id } },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        try {
          const { data, error } = await fetchEquipmentByCode(decodedText);
          if (error) { setErr(error.message); setRow(null); return; }
          if (!data) { setErr(`No equipment found for code: ${decodedText}`); setRow(null); return; }
          setRow(data as AnyRow);
          setErr(null);
          setIsScanning(false);
          await cleanupScanner();
        } catch (e: any) {
          setErr(e?.message ?? "Lookup failed");
        }
      },
      () => {}
    );
  };

  const openScanner = () => { setIsScanning(true); setTimeout(() => { void startScan(); }, 120); };
  const closeScanner = async () => { await cleanupScanner(); setIsScanning(false); };

  // 👇 NEW: save work order
  const handleSave = async () => {
    setErr(null);
    setOk(null);
    if (!user?.id) { setErr("Not signed in."); return; }
    if (!instructions && !contactName && !contactPhone) {
      setErr("Add at least one detail (instructions, name or phone).");
      return;
    }

    try {
      setSaving(true);

      // try to include equipment_id if your equipment row has 'id'
      const equipment_id = row && ("id" in row) ? (row.id as string) : null;

      const { error } = await supabase.from("work_orders").insert({
        created_by: user.id,
        equipment_id,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        job_location: jobLocation || null,
        instructions: instructions || null,
        status: "open"
      });

      if (error) throw error;

      setOk("Work order saved!");
      // optional reset
      // setRow(null);
      // setContactName(""); setContactPhone(""); setJobLocation(""); setInstructions("");
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
            onClick={openScanner}
          >
            <Scan size={18}/> Scan Equipment
          </button>

          {/* SAVE BUTTON */}
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
        </div>

        {/* auto-filled equipment fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Manufacturer" value={display.manufacturer} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Model" value={display.model} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Serial #" value={display.serial} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Customer Equipment # (Stock #)" value={display.stock} readOnly />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Hourmeter" value={display.hourmeter ?? ""} readOnly />
        </div>

        {/* manual fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Phone" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
          <input className="w-full px-3 py-2 rounded border bg-white md:col-span-2" placeholder="Job Location (optional)" value={jobLocation} onChange={e=>setJobLocation(e.target.value)} />
          <textarea className="w-full px-3 py-2 rounded border bg-white md:col-span-2 h-28" placeholder="Instructions" value={instructions} onChange={e=>setInstructions(e.target.value)} />
        </div>

        {ok && <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded">{ok}</div>}
        {err && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{err}</div>}
      </main>

      {/* scanner modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Scan Equipment</h3>
              <button onClick={closeScanner} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div id="wo-scan" className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50" style={{ minHeight: 220 }} />
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

export default WorkOrdersPage;
