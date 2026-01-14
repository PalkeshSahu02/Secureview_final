import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Settings, Shield, HelpCircle, Activity, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'org_admin':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      case 'manager':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
      case 'member':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'viewer':
        return 'bg-slate-200 text-slate-700';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/documents') return 'My Documents';
    if (path === '/shared') return 'Shared with Me';
    if (path.includes('/documents/all')) return 'All Documents';
    if (path.includes('/documents/upload')) return 'Upload Document';
    if (path === '/users') return 'Team Management';
    if (path === '/invitations') return 'Invitations';
    if (path === '/activity') return 'Activity Logs';
    if (path.includes('/settings')) return 'Settings';
    if (path === '/help') return 'Help & Support';
    return 'SecureView';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left - Page title */}
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-slate-900">{getPageTitle()}</h2>
      </div>

      {/* Center - Search (optional) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-2">
        {/* Quick Links */}
        <button
          onClick={() => navigate('/activity')}
          className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors hidden sm:block"
          title="Activity Logs"
        >
          <Activity className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate('/help')}
          className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors hidden sm:block"
          title="Help & Support"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 mx-2" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', getRoleBadgeColor(user?.role || ''))}>
                {formatRole(user?.role || '')}
              </span>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isDropdownOpen && 'rotate-180')} />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-20 overflow-hidden">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3 text-slate-400" />
                    Profile & Account
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings/security');
                    }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-3 text-slate-400" />
                    Security Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3 text-slate-400" />
                    Preferences
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
