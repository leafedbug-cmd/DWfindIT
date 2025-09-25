// src/pages/ListsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore, ListWithCount } from '../store/listStore';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';

export const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lists, isLoading, error, fetchLists, createList, deleteList } = useListStore();
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (newListName.trim()) {
      const newList = await createList(newListName.trim());
      if (newList) {
        setNewListName('');
        navigate(`/list/${newList.id}`); // Navigate to the new list after creating it
      }
    }
  };

  const handleDeleteList = (listId: string, listName: string) => {
    if (window.confirm(`Are you sure you want to delete the list "${listName}"? This will also delete all items in it.`)) {
      deleteList(listId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="My Lists" />

      <main className="flex-1 p-4 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name..."
              className="flex-grow p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleCreateList}
              className="bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
              disabled={!newListName.trim() || isLoading}
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading && lists.length === 0 && <p className="text-center text-gray-500">Loading lists...</p>}
          {error && <p className="text-center text-red-500">Error: {error}</p>}
          {!isLoading && lists.length === 0 && <p className="text-center text-gray-500">You don't have any lists yet. Create one above to get started.</p>}
          
          {lists.map((list: ListWithCount) => (
            <div key={list.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div
                className="p-4 flex items-center cursor-pointer"
                onClick={() => navigate(`/list/${list.id}`)}
              >
                <ClipboardList className="h-8 w-8 text-orange-500 mr-4" />
                <div className="flex-grow">
                  <p className="font-semibold text-gray-900">{list.name}</p>
                  <p className="text-sm text-gray-500">
                    {list.item_count} {list.item_count === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent navigating to the detail page
                    handleDeleteList(list.id, list.name);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full ml-2"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};