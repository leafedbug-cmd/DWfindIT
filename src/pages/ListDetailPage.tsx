// src/pages/ListDetailPage.tsx
import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
import { useListItemStore, ListItem } from '../store/listItemStore';
import { Trash2, Plus, Package, Hash } from 'lucide-react';

// A component to render a Part
const PartItem: React.FC<{ item: ListItem }> = ({ item }) => (
  <>
    <Hash className="h-8 w-8 text-gray-400 mr-4" />
    <div className="flex-grow">
      <p className="font-semibold text-gray-900">{item.parts?.part_number}</p>
      <p className="text-sm text-gray-500">Bin: {item.parts?.bin_location}</p>
      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
    </div>
  </>
);

// A component to render Equipment, showing the fields you requested
const EquipmentItem: React.FC<{ item: ListItem }> = ({ item }) => (
  <>
    <Package className="h-8 w-8 text-blue-500 mr-4" />
    <div className="flex-grow">
      <p className="font-semibold text-gray-900">
        {item.equipment?.make} {item.equipment?.model}
      </p>
      <p className="text-sm text-gray-500">
        Stock #: {item.equipment?.stock_number} | Serial #: {item.equipment?.serial_number || 'N/A'}
      </p>
      <p className="text-sm text-gray-500">
        Customer: {item.equipment?.customer_name || 'N/A'} ({item.equipment?.customer_number || 'N/A'})
      </p>
    </div>
  </>
);


export const ListDetailPage: React.FC = () => {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { lists } = useListStore();
  const { items, isLoading, error, fetchItems, deleteItem } = useListItemStore();

  const currentList = useMemo(() => lists.find((list) => list.id === listId), [lists, listId]);

  useEffect(() => {
    if (listId) fetchItems(listId);
  }, [listId, fetchItems]);

  const handleDeleteItem = (itemId: number) => {
    deleteItem(itemId);
  };

  if (!currentList) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p>Loading list...</p>
        <button onClick={() => navigate('/lists')} className="mt-4 text-orange-600">Go Back to Lists</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
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
                  {/* Conditionally render the correct component based on item type */}
                  {item.item_type === 'equipment' && item.equipment ? (
                    <EquipmentItem item={item} />
                  ) : (
                    <PartItem item={item} />
                  )}

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