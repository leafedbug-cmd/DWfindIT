// src/pages/ProfilePage.tsx
import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { ChevronRight, List, Moon, Sun } from 'lucide-react';

// Simplified types for this page
type UserList = {
  id: string;
  name: string;
  user_id: string;
  updated_at: string | null;
};

type ManagedEmployee = {
  id: string | null;
  employee_name: string;
  role: string | null;
  email?: string | null;
  source: 'profiles' | 'directory';
};

const ManagerSection: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [employeeLists, setEmployeeLists] = useState<Record<string, UserList[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchManagerData = async () => {
      if (!selectedStore) {
        setEmployees([]);
        setEmployeeLists({});
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch employee profiles for the selected store (non-managers)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, employee_name, role')
          .eq('store_location', selectedStore)
          .neq('role', 'manager');

        if (profileError) throw profileError;

        if (profileData && profileData.length > 0) {
          const managedProfiles: ManagedEmployee[] = profileData.map((profileRow) => ({
            id: profileRow.id,
            employee_name: profileRow.employee_name ?? 'Unnamed user',
            role: profileRow.role ?? null,
            source: 'profiles',
          }));

          setEmployees(managedProfiles);

          const profileIds = managedProfiles
            .map((profileRow) => profileRow.id)
            .filter((value): value is string => Boolean(value));

          if (profileIds.length > 0) {
            const { data: listData, error: listError } = await supabase
              .from('lists')
              .select('id, name, user_id, updated_at')
              .in('user_id', profileIds)
              .order('created_at', { ascending: false });

            if (listError) throw listError;

            const groupedLists = (listData || []).reduce<Record<string, UserList[]>>((acc, list) => {
              const key = list.user_id;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push({
                id: list.id,
                name: list.name,
                user_id: list.user_id,
                updated_at: list.updated_at ?? null,
              });
              return acc;
            }, {});

            setEmployeeLists(groupedLists);
          } else {
            setEmployeeLists({});
          }
          return;
        }

        // Fallback: Use employee directory when no profiles exist yet
        const { data: directoryData, error: directoryError } = await supabase
          .from('employee_directory')
          .select('email, employee_name, role, is_active')
          .eq('store_location', selectedStore)
          .eq('is_active', true)
          .neq('role', 'manager')
          .order('employee_name', { ascending: true });

        if (directoryError) throw directoryError;

        const managedDirectory: ManagedEmployee[] = (directoryData || []).map((row) => ({
          id: null,
          employee_name: row.employee_name ?? row.email ?? 'Unnamed user',
          role: row.role ?? null,
          email: row.email ?? null,
          source: 'directory',
        }));

        setEmployees(managedDirectory);
        setEmployeeLists({});

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
      <div className="rounded-lg bg-white border border-gray-200 p-4 dark:bg-slate-800 dark:border-slate-700">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Viewing employees and lists for store:{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {selectedStore ?? 'Choose a store above'}
          </span>
        </p>
      </div>

      {loading && <div className="p-4 text-center text-gray-600 dark:text-gray-300">Loading employee data...</div>}
      {error && <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded">{error}</div>}

      {!loading && !error && (
        employees.length === 0 ? (
          <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg dark:text-gray-300 dark:bg-slate-800 dark:border-slate-700">
            No employees found for this store.
          </div>
        ) : (
          employees.map((employee, index) => {
            const employeeKey = employee.id ?? employee.email ?? `${employee.employee_name}-${index}`;
            const userLists = employee.id ? employeeLists[employee.id] || [] : [];
            const isExpanded = employee.id !== null && expandedUserId === employee.id;
            return (
              <div key={employeeKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                <button
                  onClick={() => {
                    if (!employee.id) {
                      return;
                    }
                    setExpandedUserId(isExpanded ? null : employee.id);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left dark:hover:bg-slate-700/60"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {employee.employee_name || 'Unnamed user'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {employee.source === 'directory'
                        ? 'Needs to sign in to sync lists'
                        : `${userLists.length} list${userLists.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 dark:text-gray-300 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {employee.source === 'directory' && (
                  <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-300">
                    {employee.email
                      ? `Invite ${employee.employee_name || employee.email} to sign in so their lists appear here.`
                      : 'Employee has not signed in yet.'}
                  </div>
                )}

                {employee.source === 'profiles' && isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50 dark:border-slate-700 dark:bg-slate-900/40">
                    {userLists.length > 0 ? (
                      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                        {userLists.map((list) => (
                          <li
                            key={list.id}
                            onClick={() => navigate(`/list/${list.id}`)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60"
                          >
                            <div className="flex items-center">
                              <List className="h-4 w-4 text-gray-500 dark:text-gray-300 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{list.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-300">
                                  Updated {new Date(list.updated_at || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">This user has no lists.</p>
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
  const { theme, toggleTheme } = useTheme();
  const { selectedStore, setSelectedStore, isLoading: isStoreLoading } = useStore();
  const [storeInput, setStoreInput] = useState('');
  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  const [isLoadingStoreOptions, setIsLoadingStoreOptions] = useState(false);
  const [storeMessage, setStoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const isDarkMode = theme === 'dark';

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

  useEffect(() => {
    setStoreInput(selectedStore ?? '');
  }, [selectedStore]);

  useEffect(() => {
    let isActive = true;
    const loadStoreOptions = async () => {
      setIsLoadingStoreOptions(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('store_location')
        .not('store_location', 'is', null);

      if (!isActive) {
        return;
      }

      if (!error && data) {
        const uniqueStores = Array.from(
          new Set(
            data
              .map((row) => row.store_location)
              .filter((value): value is string => Boolean(value && value.trim()))
              .map((value) => value.trim())
          )
        ).sort((a, b) => a.localeCompare(b));
        setStoreOptions(uniqueStores);
      }
      setIsLoadingStoreOptions(false);
    };

    loadStoreOptions();
    return () => {
      isActive = false;
    };
  }, []);

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = storeInput.trim();
    if (!trimmed) {
      setStoreMessage({ type: 'error', text: 'Please enter a store location.' });
      return;
    }

    if (trimmed === (selectedStore ?? '')) {
      setStoreMessage({ type: 'success', text: 'Store location is already set to that value.' });
      return;
    }

    setStoreMessage(null);
    setIsSavingStore(true);

    const success = await setSelectedStore(trimmed);

    setIsSavingStore(false);
    if (success) {
      setStoreMessage({ type: 'success', text: 'Store location updated.' });
    } else {
      setStoreMessage({
        type: 'error',
        text: 'We could not update your store location. Please try again.',
      });
    }
  };

  const handleStoreInputChange = (value: string) => {
    setStoreInput(value);
    if (storeMessage) {
      setStoreMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-16 text-gray-900 dark:text-gray-100">
      <Header title="Profile" />
      <main className="flex-1 p-4 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Account</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">User: {user?.email}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Role: {loadingRole ? 'loading…' : role || 'user'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className={`h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-orange-500'}`} />
              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDarkMode ? 'bg-orange-500' : 'bg-gray-300'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    isDarkMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <Moon className={`h-4 w-4 ${isDarkMode ? 'text-orange-400' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 dark:bg-slate-800 dark:border-slate-700">
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Store Preference</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Set the store you&apos;re currently working out of. You can update this whenever you travel to a
              different location.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleStoreSubmit}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label htmlFor="store-location" className="sr-only">
                  Store location
                </label>
                <input
                  id="store-location"
                  list="store-location-options"
                  value={storeInput}
                  onChange={(event) => handleStoreInputChange(event.target.value)}
                  placeholder="Enter or select a store location"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:focus:border-orange-400 dark:focus:ring-orange-400"
                  disabled={isStoreLoading || isSavingStore}
                />
                {storeOptions.length > 0 && (
                  <datalist id="store-location-options">
                    {storeOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                )}
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-slate-600"
                disabled={isStoreLoading || isSavingStore}
              >
                {isSavingStore ? 'Saving...' : 'Save Store'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current store: {selectedStore ? selectedStore : 'Not set yet.'}
              {isLoadingStoreOptions && ' (loading suggestions...)'}
            </p>
          </form>
          {storeMessage && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                storeMessage.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-900/20 dark:text-green-200'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200'
              }`}
            >
              {storeMessage.text}
            </div>
          )}
        </div>

        {isManager && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Manager Tools</h2>
            <ManagerSection />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};
