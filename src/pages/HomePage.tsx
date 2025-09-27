// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Scan, Package, X, Wrench, List, ClipboardCheck } from 'lucide-react'; // UPDATED icons
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { useAuthStore } from '../store/authStore';

// ADDED: Type definition for a combined activity item
type ActivityItem = {
  id: string;
  type: 'List' | 'Work Order';
  name: string;
  date: string;
  path: string;
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedStore } = useStore();
  const [isQuickScanning, setIsQuickScanning] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannerRef, setScannerRef] = useState<Html5Qrcode | null>(null);

  // ADDED: State for recent activity
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ADDED: Effect to fetch recent activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user) return;
      
      setActivityLoading(true);

      try {
        const [listsRes, workOrdersRes] = await Promise.all([
          supabase
            .from('lists')
            .select('id, name, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('work_orders')
            .select('id, description, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        if (listsRes.error) throw listsRes.error;
        if (workOrdersRes.error) throw workOrdersRes.error;

        const combinedActivity: ActivityItem[] = [];

        listsRes.data.forEach(list => {
          combinedActivity.push({
            id: list.id,
            type: 'List',
            name: list.name,
            date: list.created_at,
            path: `/list/${list.id}`
          });
        });

        workOrdersRes.data.forEach(wo => {
          combinedActivity.push({
            id: wo.id,
            type: 'Work Order',
            name: wo.description || `Work Order #${wo.id.slice(0, 8)}`,
            date: wo.created_at,
            path: `/work-orders?id=${wo.id}` // Assuming this is the path
          });
        });

        // Sort all activities by date and take the most recent 5
        const sortedActivity = combinedActivity
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
          
        setRecentActivity(sortedActivity);
      } catch (error: any) {
        console.error("Error fetching recent activity:", error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchRecentActivity();
  }, [user]);

  useEffect(() => {
    return () => {
      if (scannerRef) {
        scannerRef.stop().catch(() => {});
      }
    };
  }, [scannerRef]);

  // ... (Quick Scan functions remain the same)
  const startQuickScan = async () => {
    setScanError(null);
    setQuickScanResult(null);
    try {
      const scannerElement = document.getElementById('quick-scanner');
      if (!scannerElement) throw new Error('Scanner container not found');
      const html5QrCode = new Html5Qrcode('quick-scanner');
      setScannerRef(html5QrCode);
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No cameras found');
      const camera = cameras.find((cam) => cam.label.toLowerCase().includes('back')) || cameras[0];
      await html5QrCode.start(
        camera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            await html5QrCode.stop();
            setScannerRef(null);
            const { data: partData, error: partError } = await supabase.from('parts').select('*').eq('part_number', decodedText).eq('store_location', selectedStore).maybeSingle();
            if (partError) setScanError(`Database error: ${partError.message}`);
            else if (!partData) setScanError(`Part "${decodedText}" not found in store ${selectedStore}`);
            else setQuickScanResult(partData);
          } catch (err: any) { setScanError(err.message || 'Failed to process scan'); }
        },
        (errorMessage) => { if (!errorMessage.includes('NotFoundException')) console.debug('Scanner error:', errorMessage); }
      );
    } catch (err: any) {
      setScanError(err.message || 'Failed to start scanner');
      if (scannerRef) { try { await scannerRef.stop(); } catch {} setScannerRef(null); }
    }
  };
  const handleQuickScan = () => { setIsQuickScanning(true); setTimeout(() => { startQuickScan(); }, 100); };
  const closeQuickScan = async () => { if (scannerRef) { try { await scannerRef.stop(); } catch (err) { console.log('Scanner already stopped'); } setScannerRef(null); } setIsQuickScanning(false); setQuickScanResult(null); setScanError(null); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />
      <main className="flex-1 p-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm">Store: {selectedStore}</p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={handleQuickScan} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center">
              <Scan className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Quick Scan</span>
              <span className="text-sm text-gray-500 text-center">Scan to view part info</span>
            </button>
            <button onClick={() => navigate('/work-orders')} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center">
              <Wrench className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Work Orders</span>
              <span className="text-sm text-gray-500 text-center">Create & view orders</span>
            </button>
            <button onClick={() => navigate('/inventory')} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center">
              <Package className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900">Inventory</span>
              <span className="text-sm text-gray-500 text-center">Browse parts</span>
            </button>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {/* UPDATED: Recent Activity section is now dynamic */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {activityLoading ? (
              <p className="p-6 text-center text-gray-500">Loading activity...</p>
            ) : recentActivity.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {recentActivity.map(item => (
                  <li key={`${item.type}-${item.id}`} className="p-4 flex items-center cursor-pointer hover:bg-gray-50" onClick={() => navigate(item.path)}>
                    {item.type === 'List' ? <List className="h-6 w-6 text-gray-400 mr-4" /> : <ClipboardCheck className="h-6 w-6 text-gray-400 mr-4" />}
                    <div className="flex-grow">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.type} - {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </main>
      {isQuickScanning && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> <div className="bg-white rounded-lg max-w-md w-full p-6"> <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-semibold">Quick Scan</h3> <button onClick={closeQuickScan} className="text-gray-400 hover:text-gray-600"> <X className="h-6 w-6" /> </button> </div> <div id="quick-scanner" className="w-full h-64 border-2 border-gray-300 rounded-lg mb-4" style={{ minHeight: '256px', backgroundColor: '#f9fafb' }}></div> {scanError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{scanError}</div>} {quickScanResult && ( <div className="mb-4 p-4 bg-green-100 rounded"> <h4 className="font-semibold text-green-800">Part Found!</h4> <p><strong>Part:</strong> {quickScanResult.part_number}</p> <p><strong>Bin:</strong> {quickScanResult.bin_location}</p> </div> )} </div> </div> )}
      <BottomNav />
    </div>
  );
};