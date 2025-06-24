import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, ClipboardList, Package, FileText } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';

export const HomePage: React.FC = () => {
  const { lists, fetchLists } = useListStore();
  const { items, fetchItems } = useScanItemStore();
  
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);
  
  useEffect(() => {
    if (lists.length > 0) {
      fetchItems(lists[0].id);
    }
  }, [lists, fetchItems]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Inventory Scanner" />
      
      <main className="flex-1 p-4">
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Welcome Back</h2>
          <p className="opacity-90 mb-4">Your mobile inventory scanning assistant</p>
          
          <Link
            to="/scan"
            className="inline-flex items-center px-4 py-2 bg-white text-orange-700 rounded-md font-medium text-sm shadow-sm hover:bg-orange-50 transition-colors"
          >
            <ScanLine className="mr-2 h-5 w-5" />
            Start Scanning
          </Link>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/lists"
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center text-center transform transition hover:shadow-md hover:translate-y-[-2px]"
            >
              <div className="bg-orange-50 p-3 rounded-full mb-3">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-medium text-gray-900">View Lists</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your inventory lists</p>
            </Link>
            
            <Link
              to="/scan"
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center text-center transform transition hover:shadow-md hover:translate-y-[-2px]"
            >
              <div className="bg-green-50 p-3 rounded-full mb-3">
                <ScanLine className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900">Scan Items</h3>
              <p className="text-sm text-gray-500 mt-1">Add new items to inventory</p>
            </Link>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            {items.length > 0 && (
              <Link to="/lists" className="text-sm text-orange-600 hover:text-orange-800">
                View All
              </Link>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {items.length > 0 ? (
              <div>
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-orange-50 p-2 rounded-full">
                        <Package className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.part_number}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          Bin: {item.bin_location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Recent Activity</h3>
                <p className="text-gray-500 mt-1">
                  Start scanning items to see them here
                </p>
                <Link
                  to="/scan"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md font-medium text-sm hover:bg-orange-700 transition-colors"
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan New Item
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};