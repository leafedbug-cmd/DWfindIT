// src/pages/ListDetailPage.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useListStore } from '../store/listStore';
// FIXED: Import the correct store with the correct name
import { useListItemStore } from '../store/listItemStore';
import { Trash2, Plus } from 'lucide-react';
import { generateCSV, generatePDF } from '../utils/export';

export const ListDetailPage: React.FC = () => {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { lists } = useListStore();
  // FIXED: Use the correct store hook
  const { items, isLoading, error, fetchItems, deleteItem } = useListItemStore();

  const currentList = lists.find((list) => list.id === listId);

  useEffect(() => {
    if (listId) fetchItems(listId);
  }, [listId, fetchItems]);

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(itemId);
    }
  };

  const handleExportCSV = () => {
    if (!currentList) return;
    const csvData = generateCSV(currentList, items ?? []);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentList.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (currentList) generatePDF(currentList, items ?? []);
  };

  const goToScanAuto = () => {
    if (!listId) return;
    // auto=1 tells Scan page to auto-start the camera
    // This correctly sends the listId as a query parameter
    navigate(`/scan?list=${encodeURIComponent(listId)}&auto=1`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title={currentList?.name || 'List Details'} showBackButton />

      <main className="flex-1 p-4 space-y-4">
        {/* Toolbar */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportCSV}
            className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="text-sm bg-red-500 text-white px-4 py-2 rounded-lg shadow-sm"
          >
            Export PDF
          </button>
          <button
            onClick={goToScanAuto}
            disabled={!listId}
            className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center justify-center disabled:opacity-60"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Items
          </button>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">Loading items...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">Error: {error}</div>
          ) : items && items.length > 0 ? (
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
              <p className="text-gray-500">This list is empty.</p>
              <button
                onClick={goToScanAuto}
                disabled={!listId}
                className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center mx-auto disabled:opacity-60"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Items
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};