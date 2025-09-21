import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../services/supabase';
import { useStore } from '../contexts/StoreContext';
import { useAuthStore } from '../store/authStore';
import { ChevronRight } from 'lucide-react';

type ProfileRow = {
  id: string;
  employee_name?: string | null;   // ← use employee_name
  email?: string | null;
  role?: string | null;
  store_location?: string | null;
};

type ListRow = {
  id: string;
  name: string;
  user_id: string;
  updated_at: string | null;
};

const ManagerSection: React.FC = () => {
  const { selectedStore } = useStore();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
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
          .select('id, employee_name, email, role, store_location') // ← employee_name
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

        // 2) fetch lists owned by those users
        if (userIds.length === 0) {
          setLists([]);
        } else {
          const { data: listData, error: listErr } = await supabase
            .from('lists')
            .select('id, name, user_id, updated_at')
            .in('user_id', userIds);
          if (listErr) throw listErr;
          if (!alive) return;
          setLists(listData || []);
        }
      } catch (e: any) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedStore]);

  const grouped = useMemo(() => {
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
          {[...grouped.entries()].map(([userId, userLists]) => {
            const owner = profilesById[userId];
            const title = owner?.employee_name || owner?.email || userId; // ← use employee_name
            const open = userId === expanded;

            return (
              <div key={userId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : userId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{title}</div>
                    <div className="text-xs text-gray-500">
                      {userLists.length} list{userLists.length !== 1 ? 's' : ''} in {selectedStore}
                      {owner?.role ? ` • role: ${owner.role}` : ''}
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>

                {open && (
                  <div className="border-t border-gray-200 divide-y">
                    {userLists.map((l) => (
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
              </div>
            );
          })}

          {grouped.size === 0 && (
            <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg">
              No employee lists found for this store.
            </div>
          )}
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-1">Account</div>
          <div className="text-sm text-gray-600">User: {user?.email}</div>
          <div className="text-sm text-gray-600">
            Role: {loadingRole ? 'loading…' : role ?? '—'}
          </div>
        </div>

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
