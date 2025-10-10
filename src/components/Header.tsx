import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton = false,
  rightAction
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);
  const { signOut } = useAuthStore();
  
  const goBack = () => {
    if (location.pathname === '/scan') {
      navigate('/lists');
    } else if (location.pathname.includes('/list/')) {
      navigate('/lists');
    } else {
      navigate(-1);
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setShowMenu(false);
  };
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {showBackButton && (
            <button
              onClick={goBack}
              className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        </div>
        
        <div className="flex items-center">
          {rightAction || (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              {showMenu && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 dark:bg-slate-800 dark:ring-slate-700"
                  onClick={() => setShowMenu(false)}
                >
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
