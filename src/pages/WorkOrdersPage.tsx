// src/pages/WorkOrdersPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../store/authStore";
import { X, Scan, Save, Eraser, Wrench } from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { useStore } from "../contexts/StoreContext";
import { useWorkOrderStore, WorkOrderWithEquipment } from "../store/workOrderStore";
import { generateWorkOrderPDF } from "../utils/workOrderExport";
import SignatureCanvas from 'react-signature-canvas';

type EquipmentFormState = {
  manufacturer: string; model: string; serial: string; stock: string; hourmeter: string;
  scannedData: Record<string, any> | null;
};

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
  // ADDED: State to hold the signature data URL
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
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
      setSignatureData(null); // Clear signature state
      setOk(null);
      setErr(null);
  };

  const handleScanSuccess = async (barcode: string) => {
    try {
      setErr(null);
      let res = await supabase.from("equipment").select("*").eq("stock_number", barcode).maybeSingle();
      if (!res.data) { res = await supabase.from("equipment").select("*").eq("serial_number", barcode).maybeSingle(); }
      if (res.error) throw res.error;
      if (!res.data) throw new Error(`No equipment found for code: ${barcode}. Please enter details manually.`);

      setEquipmentForm({
        manufacturer: res.data.make || "", model: res.data.model || "",
        serial: res.data.serial_number || "", stock: res.data.stock_number || "",
        hourmeter: res.data.hour_meter || res.data.hours || "", scannedData: res.data,
      });
      setCustomerNumber(res.data.customer_number || "");
      setIsScanning(false);
    } catch (e: any) {
      setErr(e?.message ?? "Lookup failed");
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    setErr(null);
    setOk(null);
    if (!user?.id) { setErr("Not signed in."); return; }
    if (!equipmentForm.stock && !equipmentForm.serial) { setErr("A Stock # or Serial # is required."); return; }
    // UPDATED: Check the state for the signature, not the canvas
    if (!signatureData) { setErr("A signature is required to authorize the repair."); return; }

    try {
      setSaving(true);
      
      const workOrderData = {
        user_id: user.id,
        equipment_stock_number: equipmentForm.scannedData?.stock_number || null,
        customer_number: customerNumber || null,
        store_location: selectedStore,
        description: `Work order for ${equipmentForm.manufacturer} ${equipmentForm.model}`,
        status: "Open",
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        job_location: jobLocation || null,
        instructions: instructions || null,
        winterization_required: winterizationRequired,
        signature: signatureData, // Use the signature from state
      };

      const { data: savedData, error } = await supabase.from("work_orders").insert(workOrderData).select().single();

      if (error || !savedData) throw error || new Error("Failed to get response after saving.");

      const fullDataForPdf = { ...savedData, ...workOrderData };
      generateWorkOrderPDF(fullDataForPdf, equipmentForm);
      setOk("Work order saved and PDF downloaded!");
      
      const subject = `New Work Order for ${equipmentForm.manufacturer} ${equipmentForm.model}`;
      const body = `A new work order has been created. See attached PDF.`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      resetAllFields();
      if (user) fetchWorkOrders(user.id);

    } catch (e: any) {
      setErr(e?.message ?? "Failed to save work order");
    } finally {
      setSaving(false);
    }
  };

  // ADDED: Handler to clear the signature from both the canvas and state
  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Work Orders" />
      <main className="p-4 pb-6 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
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
              {/* ... equipment form inputs ... */}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
               {/* ... contact form inputs ... */}
            </div>

            <div className="pt-4 border-t border-gray-200">
                {/* ... winterization section ... */}
            </div>

            <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-700">Repair Authorization & Signature</h3>
                <p className="mt-2 text-xs text-gray-500">
                    {/* ... authorization text ... */}
                </p>
                <div className="mt-4 border border-gray-300 rounded-lg">
                    {/* UPDATED: SignatureCanvas now saves its data onEnd */}
                    <SignatureCanvas 
                        ref={sigPad}
                        penColor='black'
                        canvasProps={{ className: 'w-full h-32' }}
                        onEnd={() => {
                            if (sigPad.current) {
                                setSignatureData(sigPad.current.toDataURL());
                            }
                        }}
                    />
                </div>
                <button 
                    onClick={clearSignature}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                >
                    Clear Signature
                </button>
            </div>

            {ok && <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded">{ok}</div>}
            {err && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{err}</div>}
        </div>
        
        <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-800 pt-4">My Recent Work Orders</h2>
            {/* ... view existing work orders section ... */}
        </div>
      </main>

      {isScanning && ( /* ... scanner modal ... */ )}

      <BottomNav />
    </div>
  );
};