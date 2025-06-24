import React, { useState } from 'react';
import { X, Plus, Package, Search } from 'lucide-react';
import { supabase } from '../services/supabase';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({ 
  isOpen, 
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParts, setSelectedParts] = useState<any[]>([]);
  
  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .ilike('part_number', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPart = (part: any) => {
    if (!selectedParts.find(p => p.part_number === part.part_number)) {
      setSelectedParts([...selectedParts, part]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemovePart = (partNumber: string) => {
    setSelectedParts(selectedParts.filter(p => p.part_number !== partNumber));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a list name');
      return;
    }
    
    onSubmit(name.trim());
    setName('');
    setError('');
    setSelectedParts([]);
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

        <div className="inline-block align-bottom bg-white rounded-t-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:rounded-lg">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                <Plus className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Create New List
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 mb-1">
                        List Name
                      </label>
                      <input
                        type="text"
                        id="list-name"
                        placeholder="Enter list name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError('');
                        }}
                        className={`block w-full p-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500`}
                      />
                      {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label htmlFor="part-search" className="block text-sm font-medium text-gray-700 mb-1">
                        Search Parts
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="part-search"
                          placeholder="Search by part number"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                          {searchResults.map((part) => (
                            <button
                              key={part.part_number}
                              type="button"
                              onClick={() => handleSelectPart(part)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center"
                            >
                              <Package className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="font-medium">{part.part_number}</div>
                                <div className="text-sm text-gray-500">Bin: {part.bin_location}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected Parts */}
                      {selectedParts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Selected Parts:</h4>
                          {selectedParts.map((part) => (
                            <div
                              key={part.part_number}
                              className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                            >
                              <div className="flex items-center">
                                <Package className="h-4 w-4 text-gray-400 mr-2" />
                                <span>{part.part_number}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePart(part.part_number)}
                                className="text-gray-400 hover:text-gray-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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
              {isLoading ? 'Creating...' : 'Create List'}
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