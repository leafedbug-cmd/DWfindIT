// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Package, Wrench, List, ClipboardCheck, Camera } from 'lucide-react'; // UPDATED icons
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
            id: String(wo.id),
            type: 'Work Order',
            name: wo.description || `Work Order #${String(wo.id).slice(0, 8)}`,
            date: wo.created_at ?? new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-16">
      <Header title="Inventory Scanner" />
      <main className="flex-1 p-4 text-gray-900 dark:text-gray-100">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100 mb-4">Your mobile inventory scanning assistant</p>
          <p className="text-orange-200 text-sm">Store: {selectedStore}</p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => navigate('/work-orders')} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col items-center">
              <Wrench className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Work Orders</span>
              <span className="text-sm text-gray-500 dark:text-gray-300 text-center">Create & view orders</span>
            </button>
            <button onClick={() => navigate('/inventory')} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col items-center">
              <Package className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Inventory</span>
              <span className="text-sm text-gray-500 dark:text-gray-300 text-center">Browse parts</span>
            </button>
            <button onClick={() => navigate('/autocount')} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col items-center">
              <Camera className="h-8 w-8 text-orange-600 mb-2" />
              <span className="font-medium text-gray-900 dark:text-gray-100">AutoCount</span>
              <span className="text-sm text-gray-500 dark:text-gray-300 text-center">Capture & count items</span>
            </button>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
          {/* UPDATED: Recent Activity section is now dynamic */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            {activityLoading ? (
              <p className="p-6 text-center text-gray-500 dark:text-gray-300">Loading activity...</p>
            ) : recentActivity.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {recentActivity.map(item => (
                  <li key={`${item.type}-${item.id}`} className="p-4 flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/60" onClick={() => navigate(item.path)}>
                    {item.type === 'List' ? <List className="h-6 w-6 text-gray-400 dark:text-gray-300 mr-4" /> : <ClipboardCheck className="h-6 w-6 text-gray-400 dark:text-gray-300 mr-4" />}
                    <div className="flex-grow">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">{item.type} - {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-gray-500 dark:text-gray-300">No recent activity</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
