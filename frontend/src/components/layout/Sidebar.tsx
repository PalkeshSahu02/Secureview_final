import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Share2,
  Users,
  Settings,
  Shield,
  UserPlus,
  FolderOpen,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Documents', href: '/documents', icon: FileText },
  { name: 'Shared with Me', href: '/shared', icon: Share2 },
  { name: 'All Documents', href: '/documents/all', icon: FolderOpen, roles: ['org_admin', 'super_admin'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['org_admin', 'super_admin'] },
  { name: 'Invitations', href: '/invitations', icon: UserPlus, roles: ['org_admin', 'super_admin'] },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="flex flex-col w-64 bg-white border-r border-secondary-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-secondary-200">
        <Shield className="w-8 h-8 text-primary-600" />
        <span className="ml-2 text-xl font-bold text-secondary-900">SecureView</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
              )}
            >
              <Icon className={cn('w-5 h-5 mr-3', isActive ? 'text-primary-600' : 'text-secondary-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Organization Info */}
      {user?.organization && (
        <div className="px-4 py-4 border-t border-secondary-200">
          <div className="px-3 py-2 bg-secondary-50 rounded-lg">
            <p className="text-xs text-secondary-500">Organization</p>
            <p className="text-sm font-medium text-secondary-900 truncate">
              {user.organization.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
