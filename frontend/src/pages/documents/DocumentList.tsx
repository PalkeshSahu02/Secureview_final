import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Upload, Search, Eye, Trash2, Share2 } from 'lucide-react';
import { documentsApi } from '../../api/documents';
import type { ListDocumentsResponse } from '../../api/documents';
import type { Document } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';

interface DocumentListProps {
  mode?: 'my' | 'shared' | 'all';
}

const DocumentList: React.FC<DocumentListProps> = ({ mode = 'my' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; document: Document | null }>({
    isOpen: false,
    document: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const pageSize = 10;

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: ListDocumentsResponse = await documentsApi.list({
        uploaded_by_me: mode === 'my',
        shared_with_me: mode === 'shared',
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      setDocuments(response.documents);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode, search, page]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchParams({ search, page: '1' });
  };

  const handleDelete = async () => {
    if (!deleteModal.document) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(deleteModal.document.id);
      setDeleteModal({ isOpen: false, document: null });
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const getTitle = () => {
    switch (mode) {
      case 'shared':
        return 'Shared with Me';
      case 'all':
        return 'All Documents';
      default:
        return 'My Documents';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">{getTitle()}</h1>
          <p className="text-secondary-600 mt-1">
            {total} document{total !== 1 ? 's' : ''}
          </p>
        </div>
        {mode !== 'shared' && (
          <Link to="/documents/upload">
            <Button leftIcon={<Upload className="w-4 h-4" />}>
              Upload Document
            </Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {/* Document List */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-600">No documents found</p>
            {mode === 'my' && (
              <Link to="/documents/upload">
                <Button variant="outline" className="mt-4">
                  Upload your first document
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {mode === 'shared' ? 'Shared by' : 'Uploaded'}
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-secondary-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-8 h-8 text-primary-600 mr-3" />
                      <div>
                        <Link
                          to={`/documents/${doc.id}`}
                          className="text-sm font-medium text-secondary-900 hover:text-primary-600"
                        >
                          {doc.title}
                        </Link>
                        {doc.description && (
                          <p className="text-xs text-secondary-500 truncate max-w-xs">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-secondary-100 text-secondary-700 rounded">
                      {doc.file_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-600">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-600">
                    {mode === 'shared' ? doc.uploader?.name : formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/viewer/${doc.id}`)}
                        className="p-2 text-secondary-400 hover:text-primary-600 transition-colors"
                        title="View"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {mode === 'my' && (
                        <>
                          <button
                            onClick={() => navigate(`/documents/${doc.id}/share`)}
                            className="p-2 text-secondary-400 hover:text-green-600 transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, document: doc })}
                            className="p-2 text-secondary-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200">
            <p className="text-sm text-secondary-600">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, document: null })}
        title="Delete Document"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to delete "{deleteModal.document?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, document: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentList;
