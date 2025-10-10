// src/components/BottomNav.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, List, ScanLine, User } from 'lucide-react'; // ADDED: List, ScanLine

export const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex justify-around items-center h-16">
        <Link
          to="/"
          className={`flex flex-col items-center px-4 py-2 font-medium text-sm 
            ${isActive('/') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
        >
          <Home className={`h-6 w-6 ${isActive('/') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className="mt-1">Home</span>
        </Link>
        
        {/* ADDED: Link to /lists */}
        <Link
          to="/lists"
          className={`flex flex-col items-center px-4 py-2 font-medium text-sm 
            ${isActive('/lists') || location.pathname.includes('/list/') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
        >
          <List className={`h-6 w-6 ${isActive('/lists') || location.pathname.includes('/list/') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className="mt-1">Lists</span>
        </Link>
        
        {/* ADDED: Link to /scan. This will go to the generic scan page. */}
        <Link
          to="/scan"
          className={`flex flex-col items-center px-4 py-2 font-medium text-sm 
            ${isActive('/scan') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
        >
          <ScanLine className={`h-6 w-6 ${isActive('/scan') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className="mt-1">Scan</span>
        </Link>
        
        <Link
          to="/profile"
          className={`flex flex-col items-center px-4 py-2 font-medium text-sm 
            ${isActive('/profile') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
        >
          <User className={`h-6 w-6 ${isActive('/profile') ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className="mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
};
