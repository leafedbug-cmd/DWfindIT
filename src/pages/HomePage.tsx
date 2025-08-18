// src/pages/HomePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Scan, ClipboardList, Package, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../services/supabase';
import { useStore } from '../contexts/StoreContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStore();

  const [isQuickScanning, setIsQuickScanning] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Keep the scanner instance in a ref so we can reliably stop/clear it
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ---- utilities -----------------------------------------------------------

  const cleanupScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try { await s.stop(); } catch {}
    try { await s.clear(); } catch {}
    scannerRef.current = null;
  };

  useEffect(() => {
    // On unmount, always release the camera/video element
    return () => { void cleanupScanner(); };
  }, []);

  // ---- quick scan flow -----------------------------------------------------

  const startQuickScan = async () => {
    // prevent re-entrancy and double-inits
    if (isStarting || scannerRef.current) return;

    setScanError(null);
    setQuickScanResult(null);
    setIsStarting(true);

    try {
      const containerId = 'quick-scanner';
      const el = document.getElementById(containerId);
      if (!el) throw new Error('Scanner container not found in the DOM.');

      // ensure no stale instance leftover
      await cleanupScanner();

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error('No cameras found on this device.');

      const preferred = cameras.find(cam => /back|rear|environment/i.test(cam.label)) ?? cameras[0];

      await html5QrCode.start(
        { deviceId: { exact: preferred.id } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        // onSuccess
        async (decodedText) => {
          try {
            // Lookup in parts for the currently selected store
            const { data: partData, error: partError } = await supabase
              .from('parts')
              .select('*')
              .eq('part_number', decodedText)
              .eq('store_location', selectedStore)
              .maybeSingle();

            if (partError) {
              setScanError(`Database error: ${partError.message}`);
              setQuickScanResult(null);
              return;
            }

            if (!partData) {
              setScanError(`Part "${decodedText}" not found in store ${selectedStore}`);
              setQuickScanResult(null);
              return;
            }

            setQuickScanResult(partData);
            setScanError(null);
          } catch (e: any) {
            setScanError(e?.message || 'Failed to process scan');
            setQuickScanResult(null);
          }
        },
        // onFailure (frequent decode errors are normal)
        (errorMessage) => {
          if (!/NotFoundException/i.test(errorMessage)) {
            console.debug('Scanner decode error:', errorMessage);
          }
        }
      );
    } catch (err: any) {
      setScanError(err?.message || 'Failed to start scanner');
      await cleanupScanner();
      setIsQuickScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  const handleQuickScan = () => {
    setIsQuickScanning(true);
    // allow modal to render before initializing
    setTimeout(() => { void startQuickScan(); }, 100);
  };

  const closeQuickScan = async () => {
    await cleanupScanner();
    setIsQuickScanning(false);
    setQuickScanResult(null);
    setScanError(null);
  };

  // ---- UI ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />

      <main className="flex-1 p-4">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm mb-6">Store: {selectedStore}</p>
          <button
            onClick={() => navigate('/scan')}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center"
          >
            <Scan className="mr-2 h-5 w-5" />
            Start Scanning
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleQuickScan}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <Scan className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Quick Scan</span>
              <span className="text-sm text-gray-500 text-center">Scan to view part info</span>
            </button>
            <button
              onClick={() => navigate('/lists')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <ClipboardList className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">My Lists</span>
              <span className="text-sm text-gray-500 text-center">View scan lists</span>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <Package className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Inventory</span>
              <span className="text-sm text-gray-500 text-center">Browse parts</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No recent activity</p>
          </div>
        </div>
      </main>

      {/* Quick Scan Modal */}
      {isQuickScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quick Scan</h3>
              <button onClick={closeQuickScan} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div
              id="quick-scanner"
              className="w-full border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-gray-50 overflow-hidden"
              style={{ minHeight: '200px', maxHeight: '200px' }}
            />

            <div className="flex-shrink-0">
              {scanError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {scanError}
                </div>
              )}

              {quickScanResult && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
                  <h4 className="font-semibold text-green-800">Part Found!</h4>
                  <p><strong>Part:</strong> {quickScanResult.part_number}</p>
                  <p><strong>Bin:</strong> {quickScanResult.bin_location}</p>
                  {quickScanResult.description && (
                    <p><strong>Description:</strong> {quickScanResult.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
