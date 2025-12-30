import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Share2,
  Users,
  Activity,
  Upload,
  ArrowRight,
  TrendingUp,
  Eye,
  Shield,
  Globe,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { documentsApi } from '../../api/documents';
import type { ListDocumentsResponse } from '../../api/documents';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  link?: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, gradient, link, trend, trendUp }) => {
  const content = (
    <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {trend && (
            <div className={`flex items-center space-x-1 text-sm ${trendUp ? 'text-emerald-600' : 'text-slate-500'}`}>
              {trendUp && <TrendingUp className="w-4 h-4" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {link && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  if (link) {
    return <Link to={link} className="block">{content}</Link>;
  }
  return content;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [myDocs, setMyDocs] = useState<ListDocumentsResponse | null>(null);
  const [sharedDocs, setSharedDocs] = useState<ListDocumentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [myDocsRes, sharedDocsRes] = await Promise.all([
          documentsApi.list({ uploaded_by_me: true, page_size: 5 }),
          documentsApi.list({ shared_with_me: true, page_size: 5 }),
        ]);
        setMyDocs(myDocsRes);
        setSharedDocs(sharedDocsRes);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {getTimeOfDay()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening with your secure documents today.
          </p>
        </div>
        <Link
          to="/documents/upload"
          className="mt-4 lg:mt-0 inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-105"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload Document
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="My Documents"
          value={myDocs?.total || 0}
          icon={FileText}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          link="/documents"
          trend="Secured files"
        />
        <StatCard
          title="Shared with Me"
          value={sharedDocs?.total || 0}
          icon={Share2}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          link="/documents?filter=shared"
        />
        <StatCard
          title="Team Members"
          value="-"
          icon={Users}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          link="/users"
        />
        <StatCard
          title="Activity Logs"
          value="View"
          icon={Activity}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          link="/activity"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">My Recent Documents</h2>
            </div>
            <Link to="/documents" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center group">
              View all <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 mt-3">Loading documents...</p>
              </div>
            ) : myDocs?.documents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No documents yet</p>
                <p className="text-slate-500 text-sm mt-1">Upload your first secure document!</p>
                <Link
                  to="/documents/upload"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Now
                </Link>
              </div>
            ) : (
              myDocs?.documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {doc.file_type.toUpperCase()} • {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                    <div className="flex items-center justify-end mt-1 text-xs text-emerald-600">
                      <Shield className="w-3 h-3 mr-1" />
                      <span>Protected</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">Security Overview</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Views Today</span>
                  </div>
                  <span className="font-semibold">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Active Sessions</span>
                  </div>
                  <span className="font-semibold">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-300">Protected Files</span>
                  </div>
                  <span className="font-semibold">{myDocs?.total || 0}</span>
                </div>
              </div>
              <Link
                to="/activity"
                className="mt-6 w-full inline-flex items-center justify-center px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
              >
                <Activity className="w-4 h-4 mr-2" />
                View Activity Logs
              </Link>
            </div>
          </div>

          {/* Shared with Me */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Shared with Me</h2>
              </div>
              <Link to="/documents?filter=shared" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center text-slate-500 text-sm">Loading...</div>
              ) : sharedDocs?.documents.length === 0 ? (
                <div className="p-6 text-center">
                  <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No shared documents</p>
                </div>
              ) : (
                sharedDocs?.documents.slice(0, 3).map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="flex items-center px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0 ml-3">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500">by {doc.uploader?.name || 'Unknown'}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
