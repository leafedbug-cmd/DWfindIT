import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Plus, Minus } from 'lucide-react';
import type { ScanItem } from '../services/supabase';

interface EditScanItemModalProps {
  isOpen: boolean;
  item: ScanItem | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ScanItem>) => void;
  isLoading?: boolean;
}

export const EditScanItemModal: React.FC<EditScanItemModalProps> = ({ 
  isOpen, 
  item,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [binLocation, setBinLocation] = useState('');
  
  useEffect(() => {
    if (item) {
      setQuantity(item.quantity || 1);
      setNotes(item.notes || '');
      setPartNumber(item.part_number);
      setBinLocation(item.bin_location);
    }
  }, [item]);
  
  if (!isOpen || !item) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave(item.id, {
      quantity,
      notes,
      part_number: partNumber,
      bin_location: binLocation
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-t-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:rounded-lg">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Item
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                        Barcode
                      </label>
                      <input
                        type="text"
                        id="barcode"
                        value={item.barcode}
                        readOnly
                        className="block w-full p-2 border border-gray-300 bg-gray-50 rounded-md"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="part-number" className="block text-sm font-medium text-gray-700 mb-1">
                        Part Number
                      </label>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          id="part-number"
                          value={partNumber}
                          onChange={(e) => setPartNumber(e.target.value)}
                          className="block w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="bin-location" className="block text-sm font-medium text-gray-700 mb-1">
                        Bin Location
                      </label>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          id="bin-location"
                          value={binLocation}
                          onChange={(e) => setBinLocation(e.target.value)}
                          className="block w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <div className="flex items-center">
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-l-md border border-gray-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="p-2 w-16 text-center border-t border-b border-gray-300"
                          min="1"
                        />
                        <button 
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-r-md border border-gray-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this item..."
                        className="block w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        rows={2}
                      />
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};