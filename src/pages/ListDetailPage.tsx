import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Plus, FileText } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ScanItem } from '../components/ScanItem';
import { EditScanItemModal } from '../components/EditScanItemModal';
import { ExportModal } from '../components/ExportModal';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import type { ScanItem as ScanItemType } from '../services/supabase';

export const ListDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { lists, fetchLists, currentList, setCurrentList } = useListStore();
  const { items, fetchItems, updateItem, deleteItem, isLoading } = useScanItemStore();
  
  const [editingItem, setEditingItem] = useState<ScanItemType | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  useEffect(() => {
    if (!lists.length) {
      fetchLists();
    }
  }, [lists, fetchLists]);
  
  useEffect(() => {
    if (id) {
      fetchItems(id);
      
      const list = lists.find(l => l.id === id);
      if (list) {
        setCurrentList(list);
      }
    }
  }, [id, fetchItems, lists, setCurrentList]);
  
  const handleEditItem = (item: ScanItemType) => {
    setEditingItem(item);
  };
  
  const handleUpdateItem = async (id: string, updates: Partial<ScanItemType>) => {
    await updateItem(id, updates);
    setEditingItem(null);
  };
  
  const handleDeleteItem = async (item: ScanItemType) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem(item.id);
    }
  };
  
  const goToScan = () => {
    navigate('/scan');
  };
  
  const listName = currentList?.name || 'Loading...';
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header 
        title={listName} 
        showBackButton
        rightAction={
          <button
            onClick={() => setShowExportModal(true)}
            disabled={items.length === 0}
            className={`p-2 rounded-full hover:bg-gray-100 ${items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Share2 className="h-5 w-5 text-gray-600" />
          </button>
        }
      />
      
      <main className="flex-1 p-4">
        {isLoading && items.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg p-4 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <ScanItem
                key={item.id}
                item={item}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Items Found</h3>
            <p className="text-gray-500 mt-2 max-w-xs">
              This list is empty. Start scanning items to add them to this list.
            </p>
            <button
              onClick={goToScan}
              className="mt-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </button>
          </div>
        )}
      </main>
      
      <div className="fixed bottom-20 right-4 z-10">
        <button
          onClick={goToScan}
          className="bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      
      <EditScanItemModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        isLoading={isLoading}
      />
      
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        list={currentList}
        items={items}
      />
      
      <BottomNav />
    </div>
  );
};