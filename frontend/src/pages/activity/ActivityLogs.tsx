import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Search,
  Filter,
  MapPin,
  Monitor,
  FileText,
  User,
  Eye,
  Shield,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Globe,
  Clock,
  X
} from 'lucide-react';
import { activityApi, type ActivityLog, type ListActivityParams } from '../../api/activity';

const eventTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  document_opened: { label: 'Document Viewed', color: 'text-blue-700', icon: Eye, bgColor: 'bg-blue-100' },
  document_closed: { label: 'Session Ended', color: 'text-slate-600', icon: Clock, bgColor: 'bg-slate-100' },
  access_denied: { label: 'Access Denied', color: 'text-red-700', icon: Shield, bgColor: 'bg-red-100' },
  document_uploaded: { label: 'Document Uploaded', color: 'text-emerald-700', icon: FileText, bgColor: 'bg-emerald-100' },
  document_downloaded: { label: 'Document Downloaded', color: 'text-purple-700', icon: Download, bgColor: 'bg-purple-100' },
  screenshot_attempt: { label: 'Screenshot Blocked', color: 'text-amber-700', icon: AlertTriangle, bgColor: 'bg-amber-100' },
  print_attempt: { label: 'Print Blocked', color: 'text-amber-700', icon: AlertTriangle, bgColor: 'bg-amber-100' },
  user_login: { label: 'User Login', color: 'text-green-700', icon: User, bgColor: 'bg-green-100' },
  user_logout: { label: 'User Logout', color: 'text-slate-600', icon: User, bgColor: 'bg-slate-100' },
};

const ActivityLogs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [page, eventFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params: ListActivityParams = {
        page,
        page_size: 20,
      };
      if (eventFilter) {
        params.event_type = eventFilter;
      }
      const response = await activityApi.list(params);
      setLogs(response.logs || []);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeAgo = (dateStr: string): string => {
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
    return formatDateTime(dateStr);
  };

  const getEventConfig = (eventType: string) => {
    return eventTypeConfig[eventType] || {
      label: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: 'text-slate-700',
      icon: Activity,
      bgColor: 'bg-slate-100'
    };
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user?.name?.toLowerCase().includes(search) ||
      log.user?.email?.toLowerCase().includes(search) ||
      log.document?.title?.toLowerCase().includes(search) ||
      log.ip_address?.includes(search) ||
      log.city?.toLowerCase().includes(search) ||
      log.country?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white hover:bg-slate-50 rounded-xl transition-colors shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
            </div>
            <p className="text-slate-500 mt-1">
              Track document views, downloads, and security events
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="pl-10 pr-4 py-2.5 w-64 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl transition-colors border ${
              showFilters || eventFilter
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Filters</h3>
            {eventFilter && (
              <button
                onClick={() => setEventFilter('')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventTypeConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setEventFilter(eventFilter === key ? '' : key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  eventFilter === key
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Activity className="w-4 h-4" />
            <span>Total Events</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Eye className="w-4 h-4" />
            <span>Document Views</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.event_type === 'document_opened').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Security Events</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {logs.filter(l => l.event_type.includes('attempt') || l.event_type === 'access_denied').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
            <Globe className="w-4 h-4" />
            <span>Unique Locations</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(logs.map(l => l.country).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {eventFilter ? `${getEventConfig(eventFilter).label} Events` : 'All Activity'}
            </h2>
            <span className="text-sm text-slate-500">{total} events</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No activity logs found</p>
            <p className="text-slate-500 text-sm mt-1">
              {searchTerm || eventFilter ? 'Try adjusting your filters' : 'Activity will appear here as users interact with documents'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const config = getEventConfig(log.event_type);
              const Icon = config.icon;

              return (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-semibold ${config.color}`}>{config.label}</p>
                          {log.document && (
                            <p className="text-sm text-slate-600 mt-0.5 flex items-center">
                              <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {log.document.title}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">{formatTimeAgo(log.created_at)}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {log.user && (
                          <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <User className="w-3.5 h-3.5" />
                            <span>{log.user.name}</span>
                            <span className="text-slate-400">({log.user.email})</span>
                          </div>
                        )}
                        {(log.city || log.country) && (
                          <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{[log.city, log.country].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{log.ip_address}</span>
                          </div>
                        )}
                        {log.browser && (
                          <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Monitor className="w-3.5 h-3.5" />
                            <span>{log.browser}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
