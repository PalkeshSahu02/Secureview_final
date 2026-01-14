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
  Activity,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Documents', href: '/documents', icon: FileText },
  { name: 'Shared with Me', href: '/shared', icon: Share2 },
  { name: 'All Documents', href: '/documents/all', icon: FolderOpen, roles: ['org_admin', 'super_admin', 'manager'] },
  { name: 'Team', href: '/users', icon: Users, roles: ['org_admin', 'super_admin', 'manager'] },
  { name: 'Invitations', href: '/invitations', icon: UserPlus, roles: ['org_admin', 'super_admin'] },
  { name: 'Activity Logs', href: '/activity', icon: Activity, roles: ['org_admin', 'super_admin', 'manager'] },
];

const bottomNavigation: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              SecureView
            </span>
            <p className="text-[10px] text-slate-400 -mt-0.5">Enterprise Security</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </p>
        {filteredNavigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white shadow-lg shadow-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 mr-3', active ? 'text-emerald-400' : 'text-slate-500')} />
              {item.name}
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-emerald-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Preferences
        </p>
        {bottomNavigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 mr-3', active ? 'text-emerald-400' : 'text-slate-500')} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Organization Info */}
      {user?.organization && (
        <div className="px-3 pb-4">
          <div className="px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {user.organization.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.organization.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
