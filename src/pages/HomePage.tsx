// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Scan, Package, X, ClipboardList } from 'lucide-react'; // ADDED: ClipboardList
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../services/supabase';
import { useStore } from '../contexts/StoreContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const [isQuickScanning, setIsQuickScanning] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannerRef, setScannerRef] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef) {
        scannerRef.stop().catch(() => {});
      }
    };
  }, [scannerRef]);

  const startQuickScan = async () => {
    setScanError(null);
    setQuickScanResult(null);

    try {
      const scannerElement = document.getElementById('quick-scanner');
      if (!scannerElement) throw new Error('Scanner container not found');

      const html5QrCode = new Html5Qrcode('quick-scanner');
      setScannerRef(html5QrCode);

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No cameras found on this device');

      const camera = cameras.find((cam) => cam.label.toLowerCase().includes('back')) || cameras[0];

      await html5QrCode.start(
        camera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            await html5QrCode.stop();
            setScannerRef(null);

            const { data: partData, error: partError } = await supabase
              .from('parts')
              .select('*')
              .eq('part_number', decodedText)
              .eq('store_location', selectedStore)
              .maybeSingle();

            if (partError) {
              setScanError(`Database error: ${partError.message}`);
            } else if (!partData) {
              setScanError(`Part "${decodedText}" not found in store ${selectedStore}`);
            } else {
              setQuickScanResult(partData);
            }
          } catch (err: any) {
            setScanError(err.message || 'Failed to process scan');
          }
        },
        (errorMessage) => {
          if (!errorMessage.includes('NotFoundException')) {
            console.debug('Scanner error:', errorMessage);
          }
        }
      );
    } catch (err: any) {
      setScanError(err.message || 'Failed to start scanner');
      if (scannerRef) {
        try {
          await scannerRef.stop();
        } catch {}
        setScannerRef(null);
      }
    }
  };

  const handleQuickScan = () => {
    setIsQuickScanning(true);
    setTimeout(() => {
      startQuickScan();
    }, 100);
  };

  const closeQuickScan = async () => {
    if (scannerRef) {
      try {
        await scannerRef.stop();
      } catch (err) {
        console.log('Scanner already stopped');
      }
      setScannerRef(null);
    }
    setIsQuickScanning(false);
    setQuickScanResult(null);
    setScanError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />

      <main className="flex-1 p-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm mb-6">Store: {selectedStore}</p>
        </div>

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
            
            {/* ADDED: "My Lists" button */}
            <button
              onClick={() => navigate('/lists')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <ClipboardList className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">My Lists</span>
              <span className="text-sm text-gray-500 text-center">View & create lists</span>
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

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No recent activity</p>
          </div>
        </div>
      </main>

      {/* Quick Scan Modal */}
      {isQuickScanning && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg max-w-md w-full p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold">Quick Scan</h3>
               <button onClick={closeQuickScan} className="text-gray-400 hover:text-gray-600">
                 <X className="h-6 w-6" />
               </button>
             </div>
             <div
               id="quick-scanner"
               className="w-full h-64 border-2 border-gray-300 rounded-lg mb-4"
               style={{ minHeight: '256px', backgroundColor: '#f9fafb' }}
             ></div>
             {scanError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{scanError}</div>}
             {quickScanResult && (
               <div className="mb-4 p-4 bg-green-100 rounded">
                 <h4 className="font-semibold text-green-800">Part Found!</h4>
                 <p><strong>Part:</strong> {quickScanResult.part_number}</p>
                 <p><strong>Bin:</strong> {quickScanResult.bin_location}</p>
               </div>
             )}
           </div>
         </div>
      )}

      <BottomNav />
    </div>
  );
};