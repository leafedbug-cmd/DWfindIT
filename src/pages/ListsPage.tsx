// src/pages/ListsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import type { ListWithCount } from '../store/listStore';
import { ClipboardList, Plus, ChevronDown, Trash2 } from 'lucide-react';

export const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lists, isLoading, error, fetchLists, createList, deleteList } = useListStore();
  const [newListName, setNewListName] = useState('');
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (newListName.trim()) {
      const newList = await createList(newListName.trim());
      if (newList) {
        setNewListName('');
        navigate(`/list/${newList.id}`); // Navigate to the new list
      }
    }
  };

  const handleDeleteList = (listId: string, listName: string) => {
    // Use a confirmation dialog before deleting
    if (window.confirm(`Are you sure you want to delete the list "${listName}"? This action cannot be undone.`)) {
      deleteList(listId);
    }
  };

  const toggleExpand = (listId: string) => {
    setExpandedListId(expandedListId === listId ? null : listId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="My Lists" />

      <main className="flex-1 p-4 space-y-4">
        {/* Create New List Section */}
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
              disabled={!newListName.trim()}
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* List of Lists */}
        <div className="space-y-3">
          {isLoading && <p className="text-center text-gray-500">Loading lists...</p>}
          {error && <p className="text-center text-red-500">Error: {error}</p>}
          {!isLoading &&
            lists.map((list: ListWithCount) => {
              // Use the normalised `item_count` provided by the store.
              const itemCount = list.item_count || 0;
              const isExpanded = expandedListId === list.id;

              return (
                <div key={list.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div
                    className="p-4 flex items-center cursor-pointer"
                    onClick={() => navigate(`/list/${list.id}`)}
                  >
                    <ClipboardList className="h-8 w-8 text-orange-500 mr-4" />
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-900">{list.name}</p>
                      <p className="text-sm text-gray-500">
                        Created {new Date(list.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {itemCount} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation when clicking the arrow
                          toggleExpand(list.id);
                        }}
                        className={`p-1 rounded-full hover:bg-gray-100 transition-transform transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* --- EXPANDABLE DELETE BUTTON AREA --- */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation here too
                          handleDeleteList(list.id, list.name);
                        }}
                        className="w-full flex items-center justify-center p-2 text-red-600 font-medium rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete List
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
