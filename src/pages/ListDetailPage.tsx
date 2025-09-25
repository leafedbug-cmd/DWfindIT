// src/pages/ListDetailPage.tsx
import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useListItemStore } from '../store/listItemStore';
import { Trash2, Plus } from 'lucide-react';

export const ListDetailPage: React.FC = () => {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { lists } = useListStore();
  const { items, isLoading, error, fetchItems, deleteItem } = useListItemStore();

  const currentList = useMemo(() => lists.find((list) => list.id === listId), [lists, listId]);

  useEffect(() => {
    if (listId) {
      fetchItems(listId);
    }
  }, [listId, fetchItems]);

  const handleDeleteItem = (itemId: number) => {
    deleteItem(itemId);
  };

  if (!currentList) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p>Loading list...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title={currentList.name} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">Loading items...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">Error: {error}</div>
          ) : items.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="p-4 flex items-center">
                  <div className="flex-grow">
                    <p className="font-semibold text-gray-900">{item.part_number}</p>
                    <p className="text-sm text-gray-500">Bin: {item.bin_location}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">This list is empty. Add an item to get started.</p>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t">
        <button
            onClick={() => navigate(`/scan?list=${listId}`)}
            className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-center font-medium"
        >
            <Plus className="h-5 w-5 mr-2" />
            Add Item to List
        </button>
      </div>

      <BottomNav />
    </div>
  );
};