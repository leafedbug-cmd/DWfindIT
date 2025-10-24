// src/pages/ListDetailPage.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore, ShareRole } from '../store/listStore';
import { useListItemStore, ListItem } from '../store/listItemStore';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../contexts/StoreContext';
import { useAuthStore } from '../store/authStore';
import { Trash2, Plus, FileText, FileSpreadsheet, Search, Share2, UserPlus, UserMinus, X } from 'lucide-react';
import { generateCSV, generatePDF } from '../utils/export';

// Small helpers to call custom RPCs not present in generated TS types
const rpcGetProfilesByIds = (ids: string[]) =>
  (supabase as any).rpc('get_profiles_by_ids', { profile_ids: ids }) as Promise<{ data: any[] | null; error: any | null }>;

const rpcSearchProfilesForSharing = (term: string, limit: number) =>
  (supabase as any).rpc('search_profiles_for_sharing', { search_term: term, limit_count: limit }) as Promise<{ data: any[] | null; error: any | null }>;

// --- Numeric Keypad Component (for Quantity) ---
const Keypad = ({ initialValue, onDone, onCancel }: { initialValue: number, onDone: (value: number) => void, onCancel: () => void }) => {
    const [inputValue, setInputValue] = useState(String(initialValue));

    const handleButtonClick = (value: string) => {
        if (inputValue.length >= 6) return;
        setInputValue(current => (current === '0' ? value : current + value));
    };

    const handleBackspace = () => {
        setInputValue(current => (current.length > 1 ? current.slice(0, -1) : '0'));
    };

    const handleDone = () => {
        const finalValue = parseInt(inputValue, 10);
        if (!isNaN(finalValue)) {
            onDone(finalValue);
        }
    };

    const keyLayout = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs dark:bg-slate-900">
                <div className="text-right text-4xl font-semibold bg-gray-100 rounded-lg p-3 mb-4 break-all text-gray-900 dark:bg-slate-800 dark:text-gray-100">
                    {inputValue}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {keyLayout.flat().map((key, index) => {
                        if (key === '') return <div key={index}></div>;
                        const action = key === '⌫' ? handleBackspace : () => handleButtonClick(key);
                        return (
                            <button key={index} onClick={action} className="text-2xl h-16 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                                {key}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={onCancel} className="text-lg py-3 font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                        Cancel
                    </button>
                    <button onClick={handleDone} className="text-lg py-3 font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SearchKeypad Component ---
const SearchKeypad = ({ onSearch, onCancel, isSearching, searchError }: { onSearch: (value: string) => void, onCancel: () => void, isSearching: boolean, searchError: string | null }) => {
    const [inputValue, setInputValue] = useState('');

    const handleButtonClick = (value: string) => {
        if (inputValue.length >= 20) return;
        setInputValue(current => current + value);
    };

    const handleBackspace = () => {
        setInputValue(current => current.slice(0, -1));
    };

    const handleSearch = () => {
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
        }
    };

    const keyLayout = [
        ['1', '2', '3'], 
        ['4', '5', '6'], 
        ['7', '8', '9'],
        ['-', '0', '⌫']
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs dark:bg-slate-900">
                <h3 className="text-lg font-semibold text-center text-gray-800 mb-2 dark:text-gray-100">Manual Search & Add</h3>
                <div className="text-right text-3xl font-semibold bg-gray-100 rounded-lg p-3 mb-4 break-all text-gray-900 min-h-[52px] dark:bg-slate-800 dark:text-gray-100">
                    {inputValue || <span className="text-gray-400 dark:text-gray-500">Enter value...</span>}
                </div>
                {searchError && <p className="text-red-500 text-sm text-center mb-2 dark:text-red-300">{searchError}</p>}
                <div className="grid grid-cols-3 gap-3">
                    {keyLayout.flat().map((key, index) => {
                        const action = key === '⌫' ? handleBackspace : () => handleButtonClick(key);
                        return (
                            <button key={index} onClick={action} className="text-2xl h-14 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                                {key}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={onCancel} className="text-lg py-3 font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600">
                        Cancel
                    </button>
                    <button onClick={handleSearch} disabled={isSearching || !inputValue} className="text-lg py-3 font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400">
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ClipboardIcon: React.FC<{ onClick: () => void; label: string; showCopied: boolean }> = ({ onClick, label, showCopied }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative mr-4 flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:bg-orange-500/20"
    >
        <svg className="h-8 w-8" viewBox="0 0 64 64" role="img" aria-hidden="true">
            <title>{label}</title>
            <rect x="10" y="8" width="30" height="40" rx="4" fill="#EA580C" />
            <rect x="18" y="4" width="14" height="8" rx="3" fill="#0F172A" />
            <rect x="26" y="18" width="28" height="40" rx="4" fill="#0B1120" />
            <path d="M54 38a12 12 0 0 1-12 12V26a12 12 0 0 1 12 12Z" fill="#EA580C" />
            <path d="M42 26c4.418 0 8 3.582 8 8v10" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {showCopied && (
            <span className="absolute -bottom-1 left-1/2 translate-y-full -translate-x-1/2 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                Copied
            </span>
        )}
    </button>
);

const ItemDetails: React.FC<{ item: ListItem; onCopy: () => void; isCopied: boolean }> = ({ item, onCopy, isCopied }) => {
    const label =
        item.item_type === 'equipment'
            ? `Copy ${item.equipment?.make || ''} ${item.equipment?.model || ''} details`
            : `Copy part ${item.parts?.part_number || ''} details`;

    if (item.item_type === 'equipment' && item.equipment) {
        return (
            <>
                <ClipboardIcon onClick={onCopy} label={label.trim() || 'Copy equipment details'} showCopied={isCopied} />
                <div className="flex-grow">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.equipment.make} {item.equipment.model}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Stock #: {item.equipment.stock_number}</p>
                </div>
            </>
        );
    }
    
    if (item.item_type === 'part' && item.parts) {
        return (
            <>
                <ClipboardIcon onClick={onCopy} label={label.trim() || 'Copy part details'} showCopied={isCopied} />
                <div className="flex-grow">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.parts.part_number}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Bin: {item.parts.bin_location}</p>
                </div>
            </>
        );
    }
    
    return (
        <>
            <ClipboardIcon onClick={onCopy} label="Copy item details" showCopied={isCopied} />
            <div className="flex-grow">
                <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{item.item_type}</p>
                {item.quantity !== undefined && (
                    <p className="text-sm text-gray-500 dark:text-gray-300">Quantity: {item.quantity}</p>
                )}
            </div>
        </>
    );
};

type ShareProfileSummary = {
    id: string;
    employee_name: string | null;
    email: string | null;
    store_location: string | null;
    role?: string | null;
};

export const ListDetailPage: React.FC = () => {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const { lists, fetchShares, shareList, revokeShare, sharesByList } = useListStore();
  const { items, isLoading, error, fetchItems, deleteItem, addItem, updateItemQuantity } = useListItemStore();
  const { selectedStore } = useStore(); 

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);
  const copyResetTimeout = useRef<number | null>(null);

  // State for quantity editing
  const [isQtyKeypadOpen, setIsQtyKeypadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharesLoading, setIsSharesLoading] = useState(false);
  const [shareProfiles, setShareProfiles] = useState<Record<string, ShareProfileSummary>>({});
  const [shareSearchTerm, setShareSearchTerm] = useState('');
  const [shareResults, setShareResults] = useState<ShareProfileSummary[]>([]);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [shareRole, setShareRole] = useState<ShareRole>('viewer');


  const currentUserId = user?.id ?? null;

  const currentList = useMemo(() => lists.find((list) => list.id === listId), [lists, listId]);
  const shares = useMemo(() => (listId ? sharesByList[listId] || [] : []), [listId, sharesByList]);
  const isOwner = currentList?.user_id === currentUserId;
  const canEditItems = isOwner || currentList?.sharedRole === 'editor';
  const isViewerOnly = !isOwner && currentList?.sharedRole !== 'editor';

  const loadShares = useCallback(async () => {
    if (!listId) return;
    setIsSharesLoading(true);
    setShareError(null);
    try {
      const records = await fetchShares(listId);
      if (records.length) {
        const participantIds = new Set<string>();
        records.forEach((shareRecord) => {
          if (shareRecord.shared_with) participantIds.add(shareRecord.shared_with);
          if (shareRecord.shared_by) participantIds.add(shareRecord.shared_by);
        });
        if (currentList?.user_id) {
          participantIds.add(currentList.user_id);
        }
        if (currentUserId) {
          participantIds.add(currentUserId);
        }

        if (participantIds.size > 0) {
          const { data, error } = await rpcGetProfilesByIds(Array.from(participantIds));
          if (error) throw error;

          const profileMap: Record<string, ShareProfileSummary> = {};
          (data ?? []).forEach((profile: any) => {
            profileMap[profile.id] = profile as ShareProfileSummary;
          });
          setShareProfiles((prev) => ({ ...prev, ...profileMap }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load shares', err);
      setShareError(err.message);
    } finally {
      setIsSharesLoading(false);
    }
  }, [listId, fetchShares, currentList?.user_id, currentUserId]);

  useEffect(() => {
    if (isShareModalOpen && isOwner) {
      loadShares();
    }
  }, [isShareModalOpen, isOwner, loadShares]);

  useEffect(() => {
    if (!isShareModalOpen) {
      setShareSearchTerm('');
      setShareResults([]);
      setShareMessage(null);
      setShareError(null);
      setIsSearchingProfiles(false);
      setShareRole('viewer');
    }
  }, [isShareModalOpen]);

  const handleOpenShareModal = () => {
    setShareError(null);
    setShareMessage(null);
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
  };

  const resolveProfileName = (id: string | null | undefined) => {
    if (!id) return 'Unknown user';
    const profile = shareProfiles[id];
    return profile?.employee_name || profile?.email || 'Unknown user';
  };

  const resolveProfileStore = (id: string | null | undefined) => {
    if (!id) return null;
    const profile = shareProfiles[id];
    return profile?.store_location || null;
  };

  const resolveProfileEmail = (id: string | null | undefined) => {
    if (!id) return null;
    return shareProfiles[id]?.email || null;
  };

  const handleSearchProfiles = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    const term = shareSearchTerm.trim();
    if (!term) {
      setShareResults([]);
      setShareMessage('Enter a name or email to search.');
      return;
    }
    setIsSearchingProfiles(true);
    setShareError(null);
    setShareMessage(null);
    try {
      const { data, error } = await rpcSearchProfilesForSharing(term, 10);
      if (error) throw error;

      const candidateMap: Record<string, ShareProfileSummary> = {};
      (data ?? []).forEach((profile: any) => {
        candidateMap[profile.id] = profile as ShareProfileSummary;
      });
      setShareProfiles((prev) => ({ ...prev, ...candidateMap }));

      const alreadySharedIds = new Set(shares.map((share) => share.shared_with));
      if (currentUserId) {
        alreadySharedIds.add(currentUserId);
      }

      const filtered = (data ?? []).filter(
        (profile: any) => profile?.id && !alreadySharedIds.has(profile.id)
      ) as ShareProfileSummary[];
      if (!filtered || filtered.length === 0) {
        setShareMessage('No matching users found or they already have access.');
      }
      setShareResults(filtered || []);
    } catch (err: any) {
      console.error('Profile search failed', err);
      setShareError(err.message);
    } finally {
      setIsSearchingProfiles(false);
    }
  };

  const handleShareWithUser = async (profileId: string) => {
    if (!listId) return;
    setShareError(null);
    setShareMessage(null);
    const result = await shareList(listId, profileId, shareRole);
    if (!result) {
      setShareError('Unable to share list. Please try again.');
      return;
    }
    setShareMessage('Access granted.');
    setShareResults((prev) => prev.filter((profile) => profile.id !== profileId));
    await loadShares();
  };

  const handleRevokeShare = async (shareId: string) => {
    setShareError(null);
    setShareMessage(null);
    await revokeShare(shareId);
    await loadShares();
  };

  useEffect(() => {
    const ownerId = currentList?.sharedBy;
    if (ownerId && !shareProfiles[ownerId]) {
      (async () => {
        try {
          const { data, error } = await rpcGetProfilesByIds([ownerId]);
          if (!error && data && data.length > 0) {
            const profile = data[0] as ShareProfileSummary;
            setShareProfiles((prev) => ({
              ...prev,
              [profile.id]: profile,
            }));
          }
        } catch (err) {
          console.error('Failed to load owner profile', err);
        }
      })();
    }
  }, [currentList?.sharedBy, shareProfiles]);

  useEffect(() => {
    if (listId) fetchItems(listId);
  }, [listId, fetchItems]);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current !== null) {
        window.clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  const handleDeleteItem = (itemId: number) => {
    if (!canEditItems) return;
    deleteItem(itemId);
  };

  const buildItemSummary = (item: ListItem): string => {
    if (item.item_type === 'equipment' && item.equipment) {
      const equipment = item.equipment;
      const lines = [
        'Type: Equipment',
        [equipment.make, equipment.model].filter(Boolean).length
          ? `Equipment: ${[equipment.make, equipment.model].filter(Boolean).join(' ')}`
          : null,
        equipment.stock_number ? `Stock #: ${equipment.stock_number}` : null,
        equipment.serial_number ? `Serial #: ${equipment.serial_number}` : null,
        equipment.customer_number ? `Customer #: ${equipment.customer_number}` : null,
        item.quantity !== undefined ? `Quantity: ${item.quantity}` : null,
        item.notes ? `Notes: ${item.notes}` : null,
      ];
      return lines.filter(Boolean).join('\n');
    }

    if (item.item_type === 'part' && item.parts) {
      const part = item.parts;
      const lines = [
        'Type: Part',
        part.part_number ? `Part #: ${part.part_number}` : null,
        part.bin_location ? `Bin Location: ${part.bin_location}` : null,
        item.quantity !== undefined ? `Quantity: ${item.quantity}` : null,
        item.notes ? `Notes: ${item.notes}` : null,
      ];
      return lines.filter(Boolean).join('\n');
    }

    const fallbackLines = [
      `Type: ${item.item_type}`,
      item.quantity !== undefined ? `Quantity: ${item.quantity}` : null,
      item.notes ? `Notes: ${item.notes}` : null,
    ];
    return fallbackLines.filter(Boolean).join('\n');
  };

  const handleCopyItemDetails = async (item: ListItem) => {
    const summary = buildItemSummary(item);
    if (!summary) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summary;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedItemId(item.id);
      if (copyResetTimeout.current !== null) {
        window.clearTimeout(copyResetTimeout.current);
      }
      copyResetTimeout.current = window.setTimeout(() => setCopiedItemId(null), 2000);
    } catch (error) {
      console.error('Failed to copy item details', error);
    }
  };

  const handleExportCSV = () => {
    if (!currentList || items.length === 0) return;
    const csvData = generateCSV(currentList, items);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentList.name.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPDF = async () => {
    if (!currentList || items.length === 0) return;
    await generatePDF(currentList, items);
  };
  
  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (!canEditItems) return;
    if (newQuantity < 0) return;
    await updateItemQuantity(itemId, newQuantity);
  };

  const handleKeypadDone = (newQuantity: number) => {
    if (editingItem && canEditItems) {
        handleUpdateQuantity(editingItem.id, newQuantity);
    }
    setIsQtyKeypadOpen(false);
    setEditingItem(null);
  };
  
  const handleManualSearchAndAdd = async (searchValue: string) => {
    if (!canEditItems) {
      setIsSearchOpen(false);
      return;
    }
    if (!searchValue || !listId) return;
    setIsSearching(true);
    setSearchError(null);
    try {
    // Build parts query; filter by store only if selectedStore is present to avoid TS null issues
    let partsQuery: any = supabase
      .from('parts')
      .select('id, part_number')
      .eq('part_number', searchValue);
    if (selectedStore) {
      partsQuery = partsQuery.eq('store_location', selectedStore);
    }
    const { data: partData, error: partError } = await partsQuery.maybeSingle();
        if (partError) throw partError;
        if (partData) {
            await addItem({ list_id: listId, item_type: 'part', part_id: partData.id, quantity: 1 });
            setAddSuccess(`Added Part: ${partData.part_number}`);
            setIsSearchOpen(false);
            return;
        }

        const { data: equipData, error: equipError } = await supabase
            .from('equipment').select('stock_number, make, model').or(`stock_number.eq.${searchValue},serial_number.eq.${searchValue}`).maybeSingle();
        if (equipError) throw equipError;
        if (equipData) {
            await addItem({ list_id: listId, item_type: 'equipment', equipment_stock_number: equipData.stock_number, quantity: 1 });
            setAddSuccess(`Added Equip: ${equipData.make} ${equipData.model}`);
            setIsSearchOpen(false);
            return;
        }
        throw new Error(`No item found for "${searchValue}"`);
    } catch (err: any) {
        setSearchError(err.message);
    } finally {
        setIsSearching(false);
        setTimeout(() => setAddSuccess(null), 3000);
    }
  };

  if (!currentList) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center text-gray-900 dark:text-gray-100">
        <p>Loading list...</p>
        <button onClick={() => navigate('/lists')} className="mt-4 text-orange-600 dark:text-orange-400">Go Back to Lists</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col pb-32 text-gray-900 dark:text-gray-100">
      <Header title={currentList.name} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {!isOwner && currentList.shared && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-200">
            Shared with you by {resolveProfileName(currentList.sharedBy)}.
          </div>
        )}
        {isViewerOnly && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
            You have view-only access to this list. Ask {resolveProfileName(currentList.sharedBy)} for edit permissions if needed.
          </div>
        )}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 gap-3 dark:bg-slate-800 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportPDF} disabled={items.length === 0} className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-red-700 disabled:bg-gray-400">
              <FileText size={16} /> Export PDF
            </button>
            <button onClick={handleExportCSV} disabled={items.length === 0} className="flex items-center justify-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-gray-400">
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
          <button
            onClick={() => {
              if (!canEditItems) return;
              setSearchError(null);
              setIsSearchOpen(true);
            }}
            disabled={!canEditItems}
            className="flex items-center justify-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-blue-100 dark:disabled:bg-slate-700/40"
          >
            <Search size={16} /> Search & Add Item
          </button>
          {isOwner && (
            <button
              onClick={handleOpenShareModal}
              className="flex items-center justify-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-purple-700"
            >
              <Share2 size={16} /> Manage Sharing
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
          {isLoading ? ( <div className="p-6 text-center text-gray-600 dark:text-gray-300">Loading items...</div> ) : 
           error ? ( <div className="p-6 text-center text-red-500 dark:text-red-300">Error: {error}</div> ) : 
           items.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((item) => (
                <li key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center flex-grow">
                    <ItemDetails
                        item={item}
                        onCopy={() => handleCopyItemDetails(item)}
                        isCopied={copiedItemId === item.id}
                    />
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={!canEditItems || item.quantity <= 0}
                          className="bg-gray-200 text-gray-700 rounded-full w-7 h-7 font-bold text-lg disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-gray-100"
                        >
                          -
                        </button>
                        <div
                          onClick={() => {
                            if (!canEditItems) return;
                            setEditingItem(item);
                            setIsQtyKeypadOpen(true);
                          }}
                          className={`text-gray-900 text-lg font-semibold w-10 text-center rounded-md p-1 ${canEditItems ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60' : 'cursor-not-allowed opacity-70'} dark:text-gray-100`}
                        >
                            {item.quantity}
                        </div>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={!canEditItems}
                          className="bg-gray-200 text-gray-700 rounded-full w-7 h-7 font-bold text-lg disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-gray-100"
                        >
                          +
                        </button>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={!canEditItems}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/10"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-300">This list is empty. Add an item to get started.</p>
            </div>
          )}
        </div>
      </main>

      {addSuccess && ( <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg text-sm z-20 dark:bg-green-900/50 dark:text-green-200">{addSuccess}</div> )}
      
      {isSearchOpen && ( <SearchKeypad onSearch={handleManualSearchAndAdd} onCancel={() => setIsSearchOpen(false)} isSearching={isSearching} searchError={searchError}/> )}

      {isQtyKeypadOpen && editingItem && (
          <Keypad initialValue={editingItem.quantity} onDone={handleKeypadDone} onCancel={() => setIsQtyKeypadOpen(false)} />
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Access</h3>
              <button
                onClick={handleCloseShareModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <form onSubmit={handleSearchProfiles} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Share with a teammate
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={shareSearchTerm}
                    onChange={(event) => setShareSearchTerm(event.target.value)}
                    placeholder="Search by name or email..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:focus:border-purple-400"
                  />
                  <div className="flex gap-2">
                    <select
                      value={shareRole}
                      onChange={(event) => setShareRole(event.target.value as ShareRole)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSearchingProfiles}
                      className="flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-400"
                    >
                      {isSearchingProfiles ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
              </form>

              {shareError && <p className="text-sm text-red-600 dark:text-red-400">{shareError}</p>}
              {shareMessage && <p className="text-sm text-green-600 dark:text-green-400">{shareMessage}</p>}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Suggestions</h4>
                {isSearchingProfiles ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Searching for teammates...</p>
                ) : shareResults.length > 0 ? (
                  <ul className="space-y-2">
                    {shareResults.map((profile) => (
                      <li key={profile.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {profile.employee_name || profile.email || 'Unnamed user'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {profile.email || 'Email unavailable'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {profile.store_location || 'Store unknown'} · Share as {shareRole === 'editor' ? 'Editor' : 'Viewer'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleShareWithUser(profile.id)}
                          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-sm font-medium text-white hover:bg-purple-700"
                        >
                          <UserPlus className="h-4 w-4" /> Share
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {shareSearchTerm ? 'No matching teammates found.' : 'Search by teammate name or email to share this list.'}
                  </p>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Current Access</h4>
                {isSharesLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading current access...</p>
                ) : shares.length > 0 ? (
                  <ul className="space-y-2">
                    {shares.map((share) => (
                      <li key={share.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {resolveProfileName(share.shared_with)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {resolveProfileEmail(share.shared_with) || 'Email unavailable'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {resolveProfileStore(share.shared_with) || 'Store unknown'} · Role: {share.role === 'editor' ? 'Editor' : 'Viewer'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Shared by {share.shared_by === currentUserId ? 'you' : resolveProfileName(share.shared_by)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
                        >
                          <UserMinus className="h-4 w-4" /> Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Only you can access this list right now.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t dark:bg-slate-900/80 dark:border-slate-800">
        <button
          onClick={() => {
            if (!canEditItems) return;
            navigate(`/scan?list=${listId}`);
          }}
          disabled={!canEditItems}
          className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-center font-medium hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:text-orange-100 dark:disabled:bg-slate-700/40"
        >
            <Plus className="h-5 w-5 mr-2" /> Add Item via Scan
        </button>
      </div>

      <BottomNav />
    </div>
  );
};
