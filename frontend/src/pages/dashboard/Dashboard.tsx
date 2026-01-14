import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Users,
  Activity,
  Shield,
  Eye,
  ArrowRight,
  FolderOpen,
  Plus,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { documentsApi } from '../../api/documents';
import { usersApi } from '../../api/users';
import { activityApi } from '../../api/activity';
import { cn } from '../../utils/cn';
import type { Document } from '../../types';

interface DashboardStats {
  totalDocuments: number;
  sharedWithMe: number;
  teamMembers: number;
  recentActivity: number;
}

interface RecentActivity {
  id: string;
  event_type: string;
  created_at: string;
  user?: { name: string; email: string };
  document?: { title: string };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    sharedWithMe: 0,
    teamMembers: 0,
    recentActivity: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'org_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load documents
      const [myDocs, sharedDocs] = await Promise.all([
        documentsApi.list({ page_size: 5 }).catch(() => ({ documents: [], total: 0 })),
        documentsApi.list({ mode: 'shared', page_size: 5 }).catch(() => ({ documents: [], total: 0 })),
      ]);

      // Load users (admin only)
      let teamCount = 0;
      if (isAdmin) {
        try {
          const usersData = await usersApi.list({ page_size: 1 });
          teamCount = usersData.total || 0;
        } catch {
          teamCount = 0;
        }
      }

      // Load activity (admin only)
      let activityData: RecentActivity[] = [];
      let activityCount = 0;
      if (isAdmin) {
        try {
          const activity = await activityApi.list({ page_size: 5 });
          activityData = activity.logs || [];
          activityCount = activity.total || 0;
        } catch {
          activityData = [];
        }
      }

      setStats({
        totalDocuments: myDocs.total || 0,
        sharedWithMe: sharedDocs.total || 0,
        teamMembers: teamCount,
        recentActivity: activityCount,
      });

      setRecentDocuments(myDocs.documents || []);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'document_opened': return Eye;
      case 'document_uploaded': return Upload;
      case 'access_denied': return AlertTriangle;
      case 'screenshot_attempt': return AlertTriangle;
      default: return Activity;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'document_opened': return 'text-blue-600 bg-blue-100';
      case 'document_uploaded': return 'text-emerald-600 bg-emerald-100';
      case 'access_denied': return 'text-red-600 bg-red-100';
      case 'screenshot_attempt': return 'text-amber-600 bg-amber-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {getGreeting()}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-slate-600 mt-1">
              Here's what's happening with your documents today.
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex space-x-3">
            <Link
              to="/documents/upload"
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Upload Document
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: 'My Documents',
            value: stats.totalDocuments,
            icon: FileText,
            color: 'from-blue-500 to-indigo-500',
            shadowColor: 'shadow-blue-200',
            link: '/documents',
          },
          {
            label: 'Shared with Me',
            value: stats.sharedWithMe,
            icon: FolderOpen,
            color: 'from-purple-500 to-pink-500',
            shadowColor: 'shadow-purple-200',
            link: '/shared',
          },
          ...(isAdmin ? [
            {
              label: 'Team Members',
              value: stats.teamMembers,
              icon: Users,
              color: 'from-emerald-500 to-teal-500',
              shadowColor: 'shadow-emerald-200',
              link: '/users',
            },
            {
              label: 'Activity Events',
              value: stats.recentActivity,
              icon: Activity,
              color: 'from-amber-500 to-orange-500',
              shadowColor: 'shadow-amber-200',
              link: '/activity',
            },
          ] : []),
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className={cn(
                'group bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:-translate-y-1',
                `shadow-lg ${stat.shadowColor}`
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center', stat.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>View all</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
              <p className="text-sm text-slate-500">Your latest uploaded documents</p>
            </div>
            <Link
              to="/documents"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center"
            >
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {recentDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No documents yet</p>
              <p className="text-slate-500 text-sm mt-1">Upload your first document to get started</p>
              <Link
                to="/documents/upload"
                className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 font-medium rounded-lg hover:bg-emerald-200 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/viewer/${doc.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <div className="flex items-center space-x-3 text-sm text-slate-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { icon: Upload, label: 'Upload Document', link: '/documents/upload', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                { icon: FolderOpen, label: 'Browse Documents', link: '/documents', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
                ...(isAdmin ? [
                  { icon: Users, label: 'Manage Team', link: '/users', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                  { icon: Activity, label: 'View Activity', link: '/activity', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
                ] : []),
              ].map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className={cn('flex items-center px-4 py-3 rounded-xl transition-colors', action.color)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Security Status</h3>
                <p className="text-sm text-slate-400">All systems protected</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Encryption', status: 'Active', icon: CheckCircle },
                { label: 'Watermarking', status: 'Enabled', icon: CheckCircle },
                { label: 'Access Control', status: 'Enforced', icon: CheckCircle },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <div className="flex items-center space-x-1 text-emerald-400">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{item.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity (Admin only) */}
          {isAdmin && recentActivity.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <Link
                  to="/activity"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentActivity.slice(0, 4).map((activity) => {
                  const Icon = getEventIcon(activity.event_type);
                  const colorClass = getEventColor(activity.event_type);
                  return (
                    <div key={activity.id} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {formatEventType(activity.event_type)}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {activity.user?.name || 'System'} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
