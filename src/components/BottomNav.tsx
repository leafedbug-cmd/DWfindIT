// src/components/BottomNav.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, ScanBarcode, User, FileText, Briefcase } from 'lucide-react';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-1 text-xs ${
    isActive ? 'text-orange-600' : 'text-gray-500'
  }`;

export const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm z-40">
      <div className="max-w-screen-md mx-auto grid grid-cols-5 md:grid-cols-6">
        <NavLink to="/" className={tabClass}>
          <div className="p-3"><Home size={20} /></div>
          Home
        </NavLink>
        <NavLink to="/lists" className={tabClass}>
          <div className="p-3"><List size={20} /></div>
          Lists
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 text-xs ${
            isActive ? 'text-orange-600' : 'text-gray-500'
          }`
        }>
          <div className="p-3"><ScanBarcode size={22} /></div>
          Scan
        </NavLink>
        <NavLink to="/work-orders" className={tabClass}>
          <div className="p-3"><FileText size={20} /></div>
          Work
        </NavLink>
        <NavLink to="/manager" className={tabClass}>
          <div className="p-3"><Briefcase size={20} /></div>
          Manager
        </NavLink>
        <NavLink to="/profile" className={tabClass}>
          <div className="p-3"><User size={20} /></div>
          Profile
        </NavLink>
      </div>
    </nav>
  );
};
