import React, { useState } from 'react';
import { Edit, Trash, ChevronRight, ClipboardList } from 'lucide-react';
import type { List } from '../services/supabase';

interface ListCardProps {
  list: List;
  itemCount?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ListCard: React.FC<ListCardProps> = ({ 
  list, 
  itemCount = 0,
  onClick,
  onEdit,
  onDelete 
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const toggleActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transform transition hover:shadow-md hover:translate-y-[-2px]"
      onClick={handleCardClick}
    >
      <div className="flex items-center p-4">
        <div className="bg-orange-50 rounded-full p-3 mr-3">
          <ClipboardList className="h-6 w-6 text-orange-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {list.name}
          </h3>
          <p className="text-sm text-gray-500">
            Created {formatDate(list.created_at)}
          </p>
        </div>
        
        <div className="flex items-center">
          <span className="bg-gray-100 text-gray-700 text-sm py-1 px-2 rounded-full mr-3">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          
          <div className="relative">
            <button 
              onClick={toggleActions}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform ${showActions ? 'rotate-90' : ''}`} />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-100 z-10">
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
      </div>
    </div>
  );
};