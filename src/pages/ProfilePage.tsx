import React, { useEffect } from 'react';
import { User, Settings, Info, Moon, Bell, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuthStore } from '../store/authStore';

export const ProfilePage: React.FC = () => {
  const { user, signOut, refreshUser } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      refreshUser();
    }
  }, [user, navigate, refreshUser]);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  
  const MenuItem = ({ icon, title, subtitle, onClick }: { 
    icon: React.ReactNode, 
    title: string, 
    subtitle: string,
    onClick?: () => void
  }) => (
    <div 
      className="flex items-center p-4 cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="mr-4">{icon}</div>
      <div className="flex-1">
        <h3 className="text-gray-900 font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  );
  
  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header title="Profile" />
      
      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-600 to-orange-800 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <div className="bg-white/20 p-3 rounded-full">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-white">{user.email}</h2>
                <p className="text-orange-100 text-sm">Account Settings</p>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            <MenuItem 
              icon={<Settings className="h-5 w-5 text-gray-500" />}
              title="Account Settings"
              subtitle="Update your profile information"
            />
            <MenuItem 
              icon={<Bell className="h-5 w-5 text-gray-500" />}
              title="Notifications"
              subtitle="Configure notification preferences"
            />
            <MenuItem 
              icon={<Moon className="h-5 w-5 text-gray-500" />}
              title="Appearance"
              subtitle="Light and dark mode settings"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 text-gray-700 font-medium">
            Security
          </div>
          <div className="divide-y divide-gray-200">
            <MenuItem 
              icon={<Shield className="h-5 w-5 text-gray-500" />}
              title="Privacy Settings"
              subtitle="Manage your data and privacy"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 text-gray-700 font-medium">
            About
          </div>
          <div className="divide-y divide-gray-200">
            <MenuItem 
              icon={<Info className="h-5 w-5 text-gray-500" />}
              title="About The App"
              subtitle="Version information and credits"
            />
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </button>
      </main>
      
      <BottomNav />
    </div>
  );
};