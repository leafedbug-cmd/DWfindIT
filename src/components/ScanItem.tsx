import React, { useState } from 'react';
import { Package, Trash, Edit, MapPin, ClipboardEdit } from 'lucide-react';
import type { ScanItem as ScanItemType } from '../services/supabase';

interface ScanItemProps {
  item: ScanItemType;
  onEdit?: (item: ScanItemType) => void;
  onDelete?: (item: ScanItemType) => void;
}

export const ScanItem: React.FC<ScanItemProps> = ({ item, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  const handleEdit = () => {
    if (onEdit) onEdit(item);
    setShowActions(false);
  };
  
  const handleDelete = () => {
    if (onDelete) onDelete(item);
    setShowActions(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Package className="h-4 w-4 text-orange-600 mr-1" />
            <h3 className="font-medium text-gray-900">
              {item.part_number}
            </h3>
            {item.quantity > 1 && (
              <span className="ml-2 bg-orange-50 text-orange-700 text-xs py-0.5 px-2 rounded-full">
                Qty: {item.quantity}
              </span>
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{item.bin_location}</span>
          </div>
          
          <div className="text-xs text-gray-400">
            {formatDate(item.created_at)}
          </div>
          
          {item.notes && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 border-l-2 border-gray-300">
              {item.notes}
            </div>
          )}
        </div>
        
        <div className="relative ml-2">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ClipboardEdit className="h-5 w-5 text-gray-500" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-100 z-10 w-32">
              <button
                onClick={handleEdit}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs font-mono text-gray-500 truncate">
          {item.barcode}
        </div>
      </div>
    </div>
  );
};