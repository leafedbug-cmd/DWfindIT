import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Scan, ClipboardList, Package, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../services/supabase';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isQuickScanning, setIsQuickScanning] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const handleQuickScan = async () => {
    setIsQuickScanning(true);
    setScanError(null);
    setQuickScanResult(null);
    
    const html5QrCode = new Html5Qrcode("quick-scanner");
    
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("No cameras found");
      }
      
      const camera = cameras.find(cam => 
        cam.label.toLowerCase().includes('back') || 
        cam.label.toLowerCase().includes('environment')
      ) || cameras[0];
      
      await html5QrCode.start(
        camera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Stop scanning immediately after first successful scan
          await html5QrCode.stop();
          
          // Look up the part
          const { data: partData, error: partError } = await supabase
            .from('parts')
            .select('*')
            .eq('part_number', decodedText)
            .single();

          if (partError || !partData) {
            setScanError(`Part "${decodedText}" not found in inventory`);
          } else {
            setQuickScanResult(partData);
          }
        },
        (errorMessage) => {
          // Ignore "No QR code found" errors
          if (!errorMessage.includes("NotFoundException")) {
            console.debug(errorMessage);
          }
        }
      );
    } catch (err: any) {
      console.error("Quick scan error:", err);
      setScanError(err.message || "Failed to start scanner");
      setIsQuickScanning(false);
    }
  };
  
  const closeQuickScan = async () => {
    const scanner = document.getElementById("quick-scanner");
    if (scanner) {
      try {
        const html5QrCode = new Html5Qrcode("quick-scanner");
        await html5QrCode.stop();
      } catch (err) {
        // Scanner might already be stopped
      }
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
          <p className="text-orange-100 mb-6">Your mobile inventory scanning assistant</p>
          
          <button
            onClick={() => navigate('/scan')}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center"
          >
            <Scan className="mr-2 h-5 w-5" />
            Start Scanning
          </button>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/lists')}
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <ClipboardList className="h-12 w-12 text-orange-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Lists</h3>
              <p className="text-sm text-gray-600">Manage your inventory lists</p>
            </button>
            
            <button
              onClick={handleQuickScan}
              className="bg-white rounded-lg shadow-sm p-6 text-center hover:shadow-md transition-shadow"
            >
              <Scan className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Scan</h3>
              <p className="text-sm text-gray-600">One-time bin lookup</p>
            </button>
          </div>
        </div>
        
        {/* Recent Activity section remains the same */}
      </main>
      
      {/* Quick Scan Modal */}
      {isQuickScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Quick Scan</h3>
              <button
                onClick={closeQuickScan}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {!quickScanResult && !scanError && (
              <>
                <div 
                  id="quick-scanner" 
                  className="w-full rounded-lg overflow-hidden border-2 border-gray-200"
                  style={{ minHeight: '300px' }}
                />
                <p className="text-sm text-gray-600 text-center mt-2">
                  Point camera at barcode
                </p>
              </>
            )}
            
            {quickScanResult && (
              <div className="p-6 bg-green-50 rounded-lg">
                <div className="text-center mb-4">
                  <Package className="h-16 w-16 text-green-600 mx-auto" />
                </div>
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Part Number</p>
                    <p className="text-lg font-medium">{quickScanResult.part_number}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Bin Location</p>
                    <p className="text-2xl font-bold text-green-600">
                      {quickScanResult.bin_location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeQuickScan}
                  className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            )}
            
            {scanError && (
              <div className="p-6 bg-red-50 rounded-lg text-center">
                <p className="text-red-700">{scanError}</p>
                <button
                  onClick={closeQuickScan}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
};