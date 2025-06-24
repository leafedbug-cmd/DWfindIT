import React, { useState } from 'react';
import { X, FileText, Share2, Mail, Download } from 'lucide-react';
import type { List, ScanItem } from '../services/supabase';
import { generateCSV } from '../utils/export';
import { generatePDF } from '../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: List | null;
  items: ScanItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose,
  list,
  items
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  if (!isOpen || !list) return null;
  
  const handleCSVExport = async () => {
    try {
      setIsLoading(true);
      const csvContent = generateCSV(list, items);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${list.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePDFExport = async () => {
    try {
      setIsLoading(true);
      await generatePDF(list, items);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShare = async () => {
    try {
      setIsLoading(true);
      const csvContent = generateCSV(list, items);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], `${list.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, { type: 'text/csv' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${list.name} - Export`,
          text: `Exported list: ${list.name}`,
          files: [file]
        });
      } else {
        // Fallback if Web Share API is not available
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${list.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEmailExport = () => {
    try {
      setIsLoading(true);
      const csvContent = generateCSV(list, items);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const subject = encodeURIComponent(`${list.name} - Export`);
      const body = encodeURIComponent(`Please find attached the exported list: ${list.name}`);
      
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error setting up email:', error);
    } finally {
      setIsLoading(false);
    }
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
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Export List
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select your preferred export option for "{list.name}"
                </p>
              </div>
            </div>
            
            <div className="mt-6 grid gap-4">
              <button
                disabled={isLoading}
                onClick={handleCSVExport}
                className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-green-100">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Export as CSV</p>
                    <p className="text-xs text-gray-500">Download a spreadsheet-compatible file</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                disabled={isLoading}
                onClick={handlePDFExport}
                className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-red-100">
                    <Download className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Export as PDF</p>
                    <p className="text-xs text-gray-500">Generate a professional document</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                disabled={isLoading}
                onClick={handleShare}
                className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Share2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Share List</p>
                    <p className="text-xs text-gray-500">Use native sharing options</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                disabled={isLoading}
                onClick={handleEmailExport}
                className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-purple-100">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Email Export</p>
                    <p className="text-xs text-gray-500">Send as an email attachment</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
            >
              Close
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

const ChevronRight = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18l6-6-6-6"/>
  </svg>
);