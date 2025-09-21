// src/components/BottomNav.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, ScanBarcode, User, FileText, Briefcase } from 'lucide-react';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center min-w-0
   ${isActive ? 'text-orange-600' : 'text-gray-500'}`;

export const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      {/* force a single row of 6 columns on all widths */}
      <div className="mx-auto grid grid-cols-6">
        <NavLink to="/" className={tabClass} aria-label="Home">
          <div className="h-9 flex items-center justify-center">
            <Home size={18} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Home</span>
        </NavLink>

        <NavLink to="/lists" className={tabClass} aria-label="Lists">
          <div className="h-9 flex items-center justify-center">
            <List size={18} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Lists</span>
        </NavLink>

        <NavLink to="/scan" className={tabClass} aria-label="Scan">
          <div className="h-9 flex items-center justify-center">
            <ScanBarcode size={19} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Scan</span>
        </NavLink>

        <NavLink to="/work-orders" className={tabClass} aria-label="Work Orders">
          <div className="h-9 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Work</span>
        </NavLink>

        <NavLink to="/manager" className={tabClass} aria-label="Manager">
          <div className="h-9 flex items-center justify-center">
            <Briefcase size={18} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Manager</span>
        </NavLink>

        <NavLink to="/profile" className={tabClass} aria-label="Profile">
          <div className="h-9 flex items-center justify-center">
            <User size={18} />
          </div>
          <span className="text-[10px] leading-tight truncate pb-1">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
