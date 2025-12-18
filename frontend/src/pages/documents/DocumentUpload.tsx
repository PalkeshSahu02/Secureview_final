import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, ArrowLeft } from 'lucide-react';
import { documentsApi } from '../../api/documents';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'csv'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedTypes.includes(extension)) {
      return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
    }
    if (file.size > maxSize) {
      return 'File size exceeds 100MB limit';
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setError(error);
      return;
    }
    setFile(selectedFile);
    setError('');
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [title]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setError('Please provide a title and select a file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const doc = await documentsApi.upload(title, description, file);
      navigate(`/documents/${doc.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-secondary-600 hover:text-secondary-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Upload Document</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-300 hover:border-secondary-400'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center">
                <FileText className="w-12 h-12 text-primary-600 mr-4" />
                <div className="text-left">
                  <p className="text-sm font-medium text-secondary-900">{file.name}</p>
                  <p className="text-xs text-secondary-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-4 p-1 text-secondary-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-600 mb-2">
                  Drag and drop your file here, or{' '}
                  <label className="text-primary-600 hover:text-primary-700 cursor-pointer">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileInputChange}
                      accept={allowedTypes.map(t => `.${t}`).join(',')}
                    />
                  </label>
                </p>
                <p className="text-xs text-secondary-500">
                  Supported formats: PDF, Word, Excel, PowerPoint, Images (max 100MB)
                </p>
              </>
            )}
          </div>

          <Input
            label="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your document"
            required
          />

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {isUploading && (
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isUploading} disabled={!file || !title}>
              Upload Document
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUpload;
