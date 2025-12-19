import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Share2, Users, Clock, Upload, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { documentsApi } from '../../api/documents';
import type { ListDocumentsResponse } from '../../api/documents';
import Button from '../../components/common/Button';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, link }) => {
  const content = (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-3xl font-bold text-secondary-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-secondary-600 mt-1">
            Here's an overview of your secure document workspace.
          </p>
        </div>
        <Link to="/documents/upload">
          <Button leftIcon={<Upload className="w-4 h-4" />}>
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Documents"
          value={myDocs?.total || 0}
          icon={FileText}
          color="bg-primary-600"
          link="/documents"
        />
        <StatCard
          title="Shared with Me"
          value={sharedDocs?.total || 0}
          icon={Share2}
          color="bg-green-600"
          link="/shared"
        />
        <StatCard
          title="Team Members"
          value="-"
          icon={Users}
          color="bg-purple-600"
          link="/users"
        />
        <StatCard
          title="Recent Activity"
          value="-"
          icon={Clock}
          color="bg-orange-600"
        />
      </div>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Recent Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">My Recent Documents</h2>
            <Link to="/documents" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-secondary-100">
            {isLoading ? (
              <div className="p-6 text-center text-secondary-500">Loading...</div>
            ) : myDocs?.documents.length === 0 ? (
              <div className="p-6 text-center text-secondary-500">
                No documents yet. Upload your first document!
              </div>
            ) : (
              myDocs?.documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center px-6 py-4 hover:bg-secondary-50 transition-colors"
                >
                  <FileText className="w-10 h-10 text-primary-600 mr-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">{doc.title}</p>
                    <p className="text-xs text-secondary-500">
                      {doc.file_type.toUpperCase()} • {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                  <span className="text-xs text-secondary-400">{formatDate(doc.created_at)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Shared with Me */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">Shared with Me</h2>
            <Link to="/shared" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-secondary-100">
            {isLoading ? (
              <div className="p-6 text-center text-secondary-500">Loading...</div>
            ) : sharedDocs?.documents.length === 0 ? (
              <div className="p-6 text-center text-secondary-500">
                No documents shared with you yet.
              </div>
            ) : (
              sharedDocs?.documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center px-6 py-4 hover:bg-secondary-50 transition-colors"
                >
                  <Share2 className="w-10 h-10 text-green-600 mr-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">{doc.title}</p>
                    <p className="text-xs text-secondary-500">
                      Shared by {doc.uploader?.name || 'Unknown'}
                    </p>
                  </div>
                  <span className="text-xs text-secondary-400">{formatDate(doc.created_at)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
