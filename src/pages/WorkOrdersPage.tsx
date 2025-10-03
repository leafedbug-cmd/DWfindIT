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

  const sigCanvas = useRef<SignatureCanvas>(null);

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
      sigCanvas.current?.clear();
      setOk(null);
      setErr(null);
  };
  
  const clearSignature = () => {
    sigCanvas.current?.clear();
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
    if (sigCanvas.current?.isEmpty()) { setErr("Customer signature is required."); return; }

    try {
      setSaving(true);
      
      const fullWorkOrderData = {
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
        ...equipmentForm
      };
      
      const signatureImage = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || null;

      const { data: savedData, error } = await supabase.from("work_orders").insert({
          user_id: fullWorkOrderData.user_id, equipment_stock_number: fullWorkOrderData.equipment_stock_number,
          customer_number: fullWorkOrderData.customer_number, store_location: fullWorkOrderData.store_location,
          description: fullWorkOrderData.description, status: fullWorkOrderData.status,
          contact_name: fullWorkOrderData.contact_name, contact_phone: fullWorkOrderData.contact_phone,
          job_location: fullWorkOrderData.job_location, instructions: fullWorkOrderData.instructions,
      }).select().single();

      if (error || !savedData) throw error || new Error("Failed to get response after saving.");
      
      generateWorkOrderPDF({ ...fullWorkOrderData, id: savedData.id }, signatureImage);
      setOk("Work order saved and PDF downloaded!");
      
      const subject = `New Work Order for ${equipmentForm.manufacturer} ${equipmentForm.model}`;
      const body = "A new work order has been created. Please find the PDF (downloaded to your device) and attach it to this email.";
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      resetAllFields();
      if (user) fetchWorkOrders(user.id);

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
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div className="flex gap-3">
              <button className="px-3 py-2 rounded bg-black text-white flex items-center gap-2" onClick={() => setIsScanning(true)}><Scan size={18}/> Scan Equipment</button>
              <button className="px-3 py-2 rounded bg-orange-600 text-white flex items-center gap-2 disabled:opacity-60" onClick={handleSave} disabled={saving}><Save size={18} />{saving ? "Saving…" : "Save"}</button>
              <button className="px-3 py-2 rounded bg-gray-500 text-white flex items-center gap-2 ml-auto" onClick={resetAllFields}><Eraser size={18} />Clear</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Manufacturer" value={equipmentForm.manufacturer} onChange={e => handleFormChange('manufacturer', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Model" value={equipmentForm.model} onChange={e => handleFormChange('model', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Serial #" value={equipmentForm.serial} onChange={e => handleFormChange('serial', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Stock #" value={equipmentForm.stock} onChange={e => handleFormChange('stock', e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Hourmeter" value={equipmentForm.hourmeter} onChange={e => handleFormChange('hourmeter', e.target.value)} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Customer Number" value={customerNumber} onChange={e=>setCustomerNumber(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-white" placeholder="Contact Phone" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
              <input className="w-full px-3 py-2 rounded border bg-gray-100 cursor-not-allowed" placeholder="Store Location" value={selectedStore} readOnly />
              <input className="w-full px-3 py-2 rounded border bg-white md:col-span-2" placeholder="Job Location (optional)" value={jobLocation} onChange={e=>setJobLocation(e.target.value)} />
              <textarea className="w-full px-3 py-2 rounded border bg-white md:col-span-2 h-28" placeholder="Instructions" value={instructions} onChange={e=>setInstructions(e.target.value)} />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-semibold text-gray-800">Repair Authorization & Signature</h3>
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md border">
                I hereby authorize the repair work described above, including any additional work deemed necessary or incidental thereto, along with all required parts and labor. I understand that payment is due upon completion of the work unless alternative arrangements have been agreed to in advance. I acknowledge and consent to an express mechanic's lien on this equipment to secure payment for all repairs and any associated fees in the event of non-payment. Customer acknowledges that an unloading fee will be applied if the machine is not unloaded from trailers. Furthermore, if Ditch Witch of Arkansas is required to unload a machine, we are not responsible for any damages that may occur to the equipment or trailer during the loading or unloading process. Furthermore, by signing below, I consent to the use of an electronic signature, which shall have the same legal effect and enforceability as a handwritten signature.
              </p>
              <div className="w-full h-40 border bg-white rounded-md">
                <SignatureCanvas 
                  ref={sigCanvas}
                  penColor='black'
                  canvasProps={{className: 'w-full h-full'}} 
                />
              </div>
              <button 
                onClick={clearSignature} 
                className="text-sm text-blue-600 hover:underline"
              >
                Clear Signature
              </button>
            </div>

            {ok && <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded">{ok}</div>}
            {err && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{err}</div>}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800 pt-4">My Recent Work Orders</h2>
            {isLoadingWorkOrders ? (
                <p className="text-center text-gray-500">Loading work orders...</p>
            ) : workOrders.length > 0 ? (
                workOrders.map((wo: WorkOrderWithEquipment) => (
                    <div key={wo.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <Wrench className="h-6 w-6 text-orange-500 mr-4"/>
                            <div className="flex-grow">
                                <p className="font-semibold">{wo.equipment?.make} {wo.equipment?.model}</p>
                                <p className="text-sm text-gray-500">Stock #: {wo.equipment?.stock_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{wo.status || 'N/A'}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(wo.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-gray-500 bg-white p-4 rounded-lg border">No work orders found.</p>
            )}
        </div>
      </main>

      {isScanning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Scan Equipment</h3>
              <button onClick={() => setIsScanning(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <BarcodeScanner onScanSuccess={(text) => handleScanSuccess(text)} onScanError={(msg) => setErr(msg)} />
            <p className="text-xs text-gray-500 mt-2">Point the camera at the equipment barcode.</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
