// src/pages/ManagerPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../services/supabaseClient';
import { ChevronRight } from 'lucide-react';

type ListRow = { id: string; name: string; user_id: string; store_location: string | null; updated_at: string | null; };
type ProfileRow = { id: string; full_name?: string | null; email?: string | null; role?: string | null; };

export const ManagerPage: React.FC = () => {
  const { selectedStore } = useStore();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStore) {
      setLists([]);
      setProfiles({});
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const { data: listData, error: listErr } = await supabase
          .from('lists')
          .select('id, name, user_id, store_location, updated_at')
          .eq('store_location', selectedStore);
        if (listErr) throw listErr;
        if (!alive) return;
        setLists(listData || []);
        const userIds = Array.from(new Set((listData || []).map(l => l.user_id)));
        if (userIds.length) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('id', userIds as string[]);
          const byId: Record<string, ProfileRow> = {};
          for (const p of (profData || [])) byId[p.id] = p;
          if (alive) setProfiles(byId);
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
    for (const l of lists) { if (!m.has(l.user_id)) m.set(l.user_id, []); m.get(l.user_id)!.push(l); }
    return m;
  }, [lists]);

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-gray-50">
      <Header title="Manager" showBackButton />
      <main className="flex-1 p-4 space-y-4">
        <div className="rounded-lg bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Store: <span className="font-medium">{selectedStore}</span></p>
        </div>

        {loading && <div className="p-4 bg-blue-50 text-blue-700 rounded">Loading…</div>}
        {err && <div className="p-4 bg-red-100 text-red-700 rounded">{err}</div>}

        {!loading && !err && (
          <div className="space-y-3">
            {[...grouped.entries()].map(([userId, userLists]) => {
              const p = profiles[userId];
              const title = p?.full_name || p?.email || userId;
              const open = userId === expanded;
              return (
                <div key={userId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(open ? null : userId)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-900">{title}</div>
                      <div className="text-xs text-gray-500">{userLists.length} list{userLists.length !== 1 ? 's' : ''} in {selectedStore}{p?.role ? ` • role: ${p.role}` : ''}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                  </button>
                  {open && (
                    <div className="border-t border-gray-200 divide-y">
                      {userLists.map(l => (
                        <div key={l.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="text-sm font-medium">{l.name}</div>
                            <div className="text-xs text-gray-500">Updated {l.updated_at ? new Date(l.updated_at).toLocaleString() : '—'}</div>
                          </div>
                          <a href={`/list/${l.id}`} className="text-orange-600 text-sm font-medium hover:underline">View</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {grouped.size === 0 && <div className="p-4 text-gray-600 bg-white border border-gray-200 rounded-lg">No employee lists found for this store.</div>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default ManagerPage;
