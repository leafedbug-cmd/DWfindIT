// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../services/supabaseClient'; // FIXED: Corrected the import path
import { useStore } from '../contexts/StoreContext';
import { useAuthStore } from '../store/authStore';
import { ChevronRight } from 'lucide-react';

type ProfileRow = {
  id: string;
  employee_name?: string | null; // matches your table
  role?: string | null;
  store_location?: string | null;
};

type ListRow = {
  id: string;
  name: string;
  user_id: string;
  updated_at: string | null;
};

type WorkOrder = {
  id: string;
  created_by: string;
  status: string | null;
  created_at: string | null;
};

const ManagerSection: React.FC = () => {
  const { selectedStore } = useStore();
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [lists, setLists] = useState<ListRow[]>([]);
  const [woByUser, setWoByUser] = useState<Record<string, WorkOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) fetch employee profiles for this store
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('id, employee_name, role, store_location')
          .eq('store_location', selectedStore);
        if (profErr) throw profErr;

        const byId: Record<string, ProfileRow> = {};
        const userIds: string[] = [];
        for (const p of profData || []) {
          byId[p.id] = p;
          userIds.push(p.id);
        }
        if (!alive) return;
        setProfilesById(byId);

        // 2) lists owned by those users
        if (userIds.length === 0) {
          setLists([]);
          setWoByUser({});
        } else {
          const [{ data: listData, error: listErr }, { data: woData, error: woErr }] =
            await Promise.all([
              supabase
                .from('lists')
                .select('id, name, user_id, updated_at')
                .in('user_id', userIds),
              supabase
                .from('work_orders')
                .select('id, created_by, status, created_at')
                .in('created_by', userIds),
            ]);

          if (listErr) throw listErr;
          if (woErr) throw woErr;
          if (!alive) return;

          setLists(listData || []);

          const grouped: Record<string, WorkOrder[]> = {};
          for (const w of (woData || [])) {
            (grouped[w.created_by] ||= []).push(w);
          }
          setWoByUser(grouped);
        }
      } catch (e: any) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedStore]);

  const listsByUser = useMemo(() => {
    const m = new Map<string, ListRow[]>();
    for (const l of lists) {
      if (!m.has(l.user_id)) m.set(l.user_id, []);
      m.get(l.user_id)!.push(l);
    }
    return m;
  }, [lists]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-white border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Store: <span className="font-medium">{selectedStore}</span>
        </p>
      </div>

      {loading && <div className="p-4 bg-blue-50 text-blue-700 rounded">Loading…</div>}
      {err && <div className="p-4 bg-red-100 text-red-700 rounded">{err}</div>}

      {!loading && !err && (
        <>
          {[...listsByUser.keys()].length === 0 && Object.keys(profilesById).length > 0 && (
            <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg">
              No employee lists found for this store.
            </div>
          )}

          {Object.keys(profilesById).length === 0 && (
            <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg">
              No employees found for this store.
            </div>
          )}

          {Object.entries(profilesById).map(([userId, owner]) => {
            const userLists = listsByUser.get(userId) || [];
            const userWOs = woByUser[userId] || [];
            const title = owner.employee_name || userId;
            const open = userId === expanded;

            return (
              <div key={userId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(open ? null : userId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {title}
                      {owner.role && (
                        <span className="text-[10px] px-2 py-[2px] rounded-full bg-gray-100 border border-gray-200 text-gray-700">
                          {owner.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {userLists.length} list{userLists.length !== 1 ? 's' : ''} • {userWOs.length} work order{userWOs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>

                {/* Body */}
                {open && (
                  <div className="border-t border-gray-200">
                    {/* Lists */}
                    <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 border-b border-gray-200">
                      Lists ({userLists.length})
                    </div>
                    {userLists.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500">No lists yet.</div>
                    ) : (
                      <div className="divide-y">
                        {userLists.map(l => (
                          <div key={l.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <div className="text-sm font-medium">{l.name}</div>
                              <div className="text-xs text-gray-500">
                                Updated {l.updated_at ? new Date(l.updated_at).toLocaleString() : '—'}
                              </div>
                            </div>
                            <a href={`/list/${l.id}`} className="text-orange-600 text-sm font-medium hover:underline">
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Work Orders */}
                    <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 border-t border-b border-gray-200">
                      Work Orders ({userWOs.length})
                    </div>
                    {userWOs.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500">No work orders yet.</div>
                    ) : (
                      <div className="divide-y">
                        {userWOs
                          .slice() // don’t mutate original
                          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                          .map(wo => (
                            <a
                              key={wo.id}
                              href={`/work-orders?id=${wo.id}`}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                            >
                              <div>
                                <div className="text-sm font-medium">WO #{wo.id.slice(0, 8)}</div>
                                <div className="text-xs text-gray-500">
                                  {wo.created_at ? new Date(wo.created_at).toLocaleString() : '—'}
                                </div>
                              </div>
                              <span className="text-xs px-2 py-[2px] rounded-full border bg-white">
                                {wo.status || 'open'}
                              </span>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingRole(true);
        if (!user) { setRole(null); return; }
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (alive) setRole(data?.role ?? null);
      } catch {
        if (alive) setRole(null);
      } finally {
        if (alive) setLoadingRole(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const isManager = role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Profile" />
      <main className="flex-1 p-4 space-y-6">
        {/* Account card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-1">Account</div>
          <div className="text-sm text-gray-600">User: {user?.email}</div>
          <div className="text-sm text-gray-600">
            Role: {loadingRole ? 'loading…' : role ?? '—'}
          </div>
        </div>

        {/* Manager tools (only for managers) */}
        {isManager && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Manager</div>
            <ManagerSection />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;