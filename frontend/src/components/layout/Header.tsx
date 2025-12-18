import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'org_admin':
        return 'bg-blue-100 text-blue-700';
      case 'manager':
        return 'bg-green-100 text-green-700';
      case 'member':
        return 'bg-yellow-100 text-yellow-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-secondary-200">
      {/* Search or breadcrumb could go here */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-secondary-400 hover:text-secondary-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary-50 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', getRoleBadgeColor(user?.role || ''))}>
                {formatRole(user?.role || '')}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-secondary-400" />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 py-1 z-20">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/settings/profile');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  <User className="w-4 h-4 mr-3" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </button>
                <hr className="my-1 border-secondary-200" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
