import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { viewerApi } from '../../api/viewer';
import type { WatermarkData } from '../../types';
import Watermark from './Watermark';

const SecureViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watermarkData, setWatermarkData] = useState<WatermarkData | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isBlurred, setIsBlurred] = useState(false);
  const heartbeatRef = useRef<number | null>(null);

  // Initialize viewing session
  useEffect(() => {
    const initSession = async () => {
      if (!id) return;

      try {
        const response = await viewerApi.initSession(id);
        setWatermarkData(response.watermark_data);
        setTotalPages(response.page_count || 1);

        // Get first page
        const blob = await viewerApi.getPage(id, 1);
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load document';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      if (id) {
        viewerApi.closeSession(id).catch(console.error);
      }
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [id]);

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!id) return;

    heartbeatRef.current = setInterval(() => {
      viewerApi.heartbeat(id, currentPage).catch(console.error);
    }, 30000); // Every 30 seconds

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [id, currentPage]);

  // Security measures
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'p' || e.key === 'c' || e.key === 'a' || e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }

      // Block F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
        reportSecurityEvent('devtools_detected');
        return false;
      }

      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        reportSecurityEvent('screenshot_attempt');
        return false;
      }
    };

    // Blur on tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    // Detect dev tools
    const detectDevTools = () => {
      const threshold = 160;
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        setIsBlurred(true);
        reportSecurityEvent('devtools_detected');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const devToolsInterval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(devToolsInterval);
    };
  }, [id]);

  const reportSecurityEvent = useCallback(async (eventType: string) => {
    if (!id) return;
    try {
      await viewerApi.reportSecurityEvent(id, eventType as any, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }, [id]);

  const handleClose = async () => {
    if (id) {
      try {
        await viewerApi.closeSession(id);
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }
    navigate(-1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handlePrevPage = async () => {
    if (currentPage > 1 && id) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      try {
        const blob = await viewerApi.getPage(id, newPage);
        if (documentUrl) URL.revokeObjectURL(documentUrl);
        setDocumentUrl(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Failed to load page:', error);
      }
    }
  };

  const handleNextPage = async () => {
    if (currentPage < totalPages && id) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      try {
        const blob = await viewerApi.getPage(id, newPage);
        if (documentUrl) URL.revokeObjectURL(documentUrl);
        setDocumentUrl(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Failed to load page:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-secondary-900 flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Loading secure document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-secondary-900 flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white text-secondary-900 rounded-lg hover:bg-secondary-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-secondary-900 z-50 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Blur overlay when tab is inactive */}
      {isBlurred && (
        <div className="absolute inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <p className="text-white text-xl">Document hidden - return to this tab to continue viewing</p>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-secondary-800 text-white px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">Secure Document Viewer</span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-secondary-700 rounded-lg transition-colors"
            disabled={zoom <= 50}
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-secondary-700 rounded-lg transition-colors"
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {totalPages > 1 && (
            <>
              <div className="w-px h-6 bg-secondary-600 mx-2" />
              <button
                onClick={handlePrevPage}
                className="p-2 hover:bg-secondary-700 rounded-lg transition-colors"
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                className="p-2 hover:bg-secondary-700 rounded-lg transition-colors"
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div
        ref={containerRef}
        className="absolute inset-0 top-14 overflow-auto flex items-start justify-center p-8"
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="relative bg-white shadow-2xl"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Document */}
          {documentUrl && (
            <object
              data={documentUrl}
              type="application/pdf"
              className="w-[800px] h-[1100px]"
              style={{ pointerEvents: 'none' }}
            >
              <img
                src={documentUrl}
                alt="Document"
                className="max-w-full"
                draggable={false}
              />
            </object>
          )}

          {/* Watermark Overlay */}
          {watermarkData && <Watermark data={watermarkData} />}
        </div>
      </div>

      {/* Footer watermark */}
      <div className="absolute bottom-0 left-0 right-0 bg-secondary-800 text-white px-4 py-2 text-xs text-center z-40">
        Viewing as: {watermarkData?.user_name} ({watermarkData?.user_email}) |
        {watermarkData?.organization} |
        {watermarkData?.location} |
        {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SecureViewer;
