import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ListCard } from '../components/ListCard';
import { CreateListModal } from '../components/CreateListModal';
import { useListStore } from '../store/listStore';
import { useScanItemStore } from '../store/scanItemStore';
import { supabase } from '../services/supabase';

export const ListsPage: React.FC = () => {
  const { lists, fetchLists, createList, updateList, deleteList, isLoading } = useListStore();
  const { addItem } = useScanItemStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);
  
  const handleCreateList = async (name: string) => {
    const newList = await createList(name);
    setShowCreateModal(false);
    
    if (newList) {
      navigate(`/list/${newList.id}`);
    }
  };
  
  const handleEditList = (id: string, name: string) => {
    updateList(id, name);
    setEditingList(null);
  };
  
  const handleDeleteList = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      await deleteList(id);
    }
  };
  
  const handleListClick = (id: string) => {
    navigate(`/list/${id}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="My Lists" />
      
      <main className="flex-1 p-4">
        {isLoading && lists.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lists.length > 0 ? (
          <div className="space-y-4">
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                itemCount={0}
                onClick={() => handleListClick(list.id)}
                onEdit={() => setEditingList(list.id)}
                onDelete={() => handleDeleteList(list.id)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <ClipboardList className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Lists Found</h3>
            <p className="text-gray-500 mt-2 max-w-xs">
              Create your first list to start scanning and organizing your inventory items.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First List
            </button>
          </div>
        )}
      </main>
      
      <div className="fixed bottom-20 right-4 z-10">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      
      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateList}
        isLoading={isLoading}
      />
      
      {editingList && (
        <CreateListModal
          isOpen={!!editingList}
          onClose={() => setEditingList(null)}
          onSubmit={(name) => {
            if (editingList) handleEditList(editingList, name);
          }}
          isLoading={isLoading}
        />
      )}
      
      <BottomNav />
    </div>
  );
};