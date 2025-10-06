// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { useAuthStore } from '../store/authStore';
import { ChevronRight, List } from 'lucide-react';

// Simplified types for this page
type Profile = {
  id: string;
  employee_name?: string | null;
  role?: string | null;
};

type UserList = {
  id: string;
  name: string;
  user_id: string;
  updated_at: string | null;
};

const ManagerSection: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeLists, setEmployeeLists] = useState<Record<string, UserList[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStore) {
      setEmployees([]);
      setEmployeeLists({});
      return;
    }

    const fetchManagerData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch all employees in the manager's store
        const { data: employeeData, error: employeeError } = await supabase
          .from('profiles')
          .select('id, employee_name, role')
          .eq('store_location', selectedStore)
          .neq('role', 'manager'); // Exclude other managers if needed
        
        if (employeeError) throw employeeError;
        setEmployees(employeeData || []);
        
        const userIds = (employeeData || []).map(e => e.id);
        if (userIds.length === 0) {
          setEmployeeLists({});
          return;
        }

        // 2. Fetch all lists belonging to those employees
        const { data: listData, error: listError } = await supabase
          .from('lists')
          .select('id, name, user_id, updated_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false });

        if (listError) throw listError;
        
        // 3. Group the lists by employee
        const listsByEmployee: Record<string, UserList[]> = {};
        for (const list of listData || []) {
          if (!listsByEmployee[list.user_id]) {
            listsByEmployee[list.user_id] = [];
          }
          listsByEmployee[list.user_id].push(list);
        }
        setEmployeeLists(listsByEmployee);

      } catch (e: any) {
        setError(e.message || 'Failed to fetch manager data');
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, [selectedStore]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-white border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Viewing employees and lists for store: <span className="font-medium">{selectedStore}</span>
        </p>
      </div>

      {loading && <div className="p-4 text-center">Loading employee data...</div>}
      {error && <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {!loading && !error && (
        employees.length === 0 ? (
          <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg">
            No employees found for this store.
          </div>
        ) : (
          employees.map(employee => {
            const userLists = employeeLists[employee.id] || [];
            const isExpanded = expandedUserId === employee.id;
            return (
              <div key={employee.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : employee.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{employee.employee_name || employee.id}</p>
                    <p className="text-xs text-gray-500">{userLists.length} list{userLists.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50">
                    {userLists.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {userLists.map(list => (
                          <li 
                            key={list.id} 
                            onClick={() => navigate(`/list/${list.id}`)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                          >
                            <div className="flex items-center">
                              <List className="h-4 w-4 text-gray-500 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{list.name}</p>
                                <p className="text-xs text-gray-500">
                                  Updated {new Date(list.updated_at || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500">This user has no lists.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )
      )}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingRole(false);
      return;
    }
    const fetchRole = async () => {
      setLoadingRole(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setRole(data?.role ?? null);
      } catch (e) {
        setRole(null);
      } finally {
        setLoadingRole(false);
      }
    };
    fetchRole();
  }, [user]);

  const isManager = role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Profile" />
      <main className="flex-1 p-4 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-1">Account</div>
          <div className="text-sm text-gray-600">User: {user?.email}</div>
          <div className="text-sm text-gray-600">
            Role: {loadingRole ? 'loading…' : role || 'user'}
          </div>
        </div>

        {isManager && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Manager Tools</h2>
            <ManagerSection />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};
