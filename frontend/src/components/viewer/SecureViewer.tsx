import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, MapPin, Shield, AlertTriangle } from 'lucide-react';
import { viewerApi } from '../../api/viewer';
import type { WatermarkData } from '../../types';
import Watermark from './Watermark';

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  country?: string;
}

const SecureViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watermarkData, setWatermarkData] = useState<WatermarkData | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isBlurred, setIsBlurred] = useState(false);
  const [screenshotWarning, setScreenshotWarning] = useState(false);
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const lastVisibilityChange = useRef<number>(Date.now());

  // Get user's geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Try to reverse geocode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`
            );
            const data = await response.json();
            if (data.address) {
              loc.city = data.address.city || data.address.town || data.address.village;
              loc.country = data.address.country;
            }
          } catch (e) {
            console.log('[SecureViewer] Could not reverse geocode:', e);
          }

          setGeoLocation(loc);
          console.log('[SecureViewer] Geolocation obtained:', loc);
        },
        (error) => {
          console.log('[SecureViewer] Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Initialize viewing session
  useEffect(() => {
    const initSession = async () => {
      if (!id) {
        console.error('[SecureViewer] No document ID provided');
        setError('No document ID provided');
        setIsLoading(false);
        return;
      }

      console.log('[SecureViewer] Starting initialization for document:', id);

      try {
        console.log('[SecureViewer] Step 1: Initializing viewing session...');
        const response = await viewerApi.initSession(id);
        console.log('[SecureViewer] Step 1 complete:', {
          hasWatermark: !!response.watermark_data,
          pageCount: response.page_count,
          document: response.document?.title
        });

        setWatermarkData(response.watermark_data);
        setTotalPages(response.page_count || 1);

        console.log('[SecureViewer] Step 2: Getting first page...');
        const blob = await viewerApi.getPage(id, 1);
        console.log('[SecureViewer] Step 2 complete:', { blobSize: blob.size, blobType: blob.type });

        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
        console.log('[SecureViewer] Document loaded successfully');
      } catch (err: unknown) {
        console.error('[SecureViewer] Error loading document:', err);

        let errorMessage = 'Failed to load document';
        let errorDetails = '';

        if (err && typeof err === 'object') {
          const axiosError = err as { response?: { status?: number; data?: { message?: string; error?: string } }; message?: string };

          if (axiosError.response) {
            const status = axiosError.response.status;
            const data = axiosError.response.data;

            errorDetails = `Status: ${status}`;

            if (status === 403) {
              errorMessage = data?.message || 'Access denied. You may need to verify your PIN or you don\'t have permission to view this document.';
            } else if (status === 404) {
              errorMessage = 'Document not found. It may have been deleted or you have an invalid link.';
            } else if (status === 401) {
              errorMessage = 'Session expired. Please log in again.';
            } else if (status === 500) {
              errorMessage = data?.message || 'Server error. The document file may be missing or corrupted.';
              errorDetails += ` - ${data?.error || 'Internal server error'}`;
            } else {
              errorMessage = data?.message || `Request failed with status ${status}`;
            }
          } else if (axiosError.message) {
            errorMessage = axiosError.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        console.error('[SecureViewer] Error details:', { errorMessage, errorDetails });
        setError(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

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
    }, 30000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [id, currentPage]);

  // Enhanced security measures
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts including screenshot
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'p' || e.key === 'c' || e.key === 'a' || e.key === 'u')
      ) {
        e.preventDefault();
        showScreenshotWarning();
        reportSecurityEvent('keyboard_shortcut_blocked', { key: e.key });
        return false;
      }

      // Block F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
        setIsBlurred(true);
        reportSecurityEvent('devtools_attempt');
        return false;
      }

      // Block PrintScreen - keydown
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showScreenshotWarning();
        reportSecurityEvent('screenshot_attempt', { method: 'printscreen' });
        return false;
      }

      // Block Windows+Shift+S (Snipping tool)
      if (e.shiftKey && e.metaKey && e.key === 's') {
        e.preventDefault();
        showScreenshotWarning();
        reportSecurityEvent('screenshot_attempt', { method: 'snipping_tool' });
        return false;
      }

      // Block Ctrl+Shift+S
      if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        showScreenshotWarning();
        reportSecurityEvent('screenshot_attempt', { method: 'ctrl_shift_s' });
        return false;
      }
    };

    // Also catch keyup for PrintScreen (some browsers only fire keyup)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        showScreenshotWarning();
        reportSecurityEvent('screenshot_attempt', { method: 'printscreen_keyup' });
        // Clear clipboard
        navigator.clipboard.writeText('Screenshot blocked by SecureView').catch(() => {});
      }
    };

    // Blur on tab switch - detect screenshot tools
    const handleVisibilityChange = () => {
      const now = Date.now();
      const timeDiff = now - lastVisibilityChange.current;
      lastVisibilityChange.current = now;

      if (document.hidden) {
        setIsBlurred(true);
        // If visibility changed very quickly (< 500ms), likely a screenshot tool
        if (timeDiff < 500) {
          showScreenshotWarning();
          reportSecurityEvent('screenshot_attempt', { method: 'rapid_visibility_change', timeDiff });
        }
      } else {
        setIsBlurred(false);
      }
    };

    // Detect window blur (when user switches to another app like snipping tool)
    const handleWindowBlur = () => {
      setIsBlurred(true);
      reportSecurityEvent('window_blur');
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
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

    // Disable copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showScreenshotWarning();
      reportSecurityEvent('copy_attempt');
      return false;
    };

    // Disable selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    const devToolsInterval = setInterval(detectDevTools, 1000);

    // CSS to prevent print
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { display: none !important; }
        body::after {
          content: "Printing is disabled for this secure document.";
          display: block;
          font-size: 24px;
          text-align: center;
          padding: 100px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(devToolsInterval);
      document.head.removeChild(style);
    };
  }, [id]);

  const showScreenshotWarning = useCallback(() => {
    setScreenshotWarning(true);
    setIsBlurred(true);
    setTimeout(() => {
      setScreenshotWarning(false);
      setIsBlurred(false);
    }, 3000);
  }, []);

  const reportSecurityEvent = useCallback(async (eventType: string, details?: Record<string, unknown>) => {
    if (!id) return;
    try {
      await viewerApi.reportSecurityEvent(id, eventType as any, {
        timestamp: new Date().toISOString(),
        location: geoLocation ? {
          lat: geoLocation.latitude,
          lng: geoLocation.longitude,
          accuracy: geoLocation.accuracy,
          city: geoLocation.city,
          country: geoLocation.country,
        } : null,
        ...details,
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }, [id, geoLocation]);

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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

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
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading secure document...</p>
          <p className="text-slate-400 text-sm mt-2">Please wait while we prepare your document</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-400 mb-4 text-lg">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Screenshot Warning Overlay */}
      {screenshotWarning && (
        <div className="absolute inset-0 bg-red-900/95 z-[100] flex items-center justify-center animate-pulse">
          <div className="text-center">
            <Shield className="w-24 h-24 text-white mx-auto mb-4" />
            <p className="text-white text-3xl font-bold mb-2">Screenshot Blocked!</p>
            <p className="text-red-200 text-lg">This attempt has been logged and reported.</p>
          </div>
        </div>
      )}

      {/* Blur overlay when tab is inactive */}
      {isBlurred && !screenshotWarning && (
        <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-3xl z-[60] flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-white text-xl font-medium">Document Protected</p>
            <p className="text-slate-400 mt-2">Return to this tab to continue viewing</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-3 flex items-center justify-between z-40 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">Secure Document Viewer</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={zoom <= 50}
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-14 text-center bg-slate-800 py-1 px-2 rounded">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {totalPages > 1 && (
            <>
              <div className="w-px h-6 bg-slate-600 mx-2" />
              <button
                onClick={handlePrevPage}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm bg-slate-800 py-1 px-3 rounded">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Location indicator */}
        {geoLocation && (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>
              {geoLocation.city || 'Unknown'}, {geoLocation.country || 'Unknown'}
            </span>
          </div>
        )}
      </div>

      {/* Document Content - TRUE Full Screen */}
      <div
        ref={containerRef}
        className="absolute top-14 bottom-12 left-0 right-0 overflow-hidden bg-slate-900"
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Document - Full Width/Height with zoom */}
        {documentUrl && (
          <div
            className="relative w-full h-full"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          >
            <iframe
              ref={iframeRef}
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH,FitV&pagemode=none`}
              className="w-full h-full border-0"
              style={{
                pointerEvents: isBlurred ? 'none' : 'auto',
                backgroundColor: 'white',
              }}
              title="Document Viewer"
            />
            {/* Watermark Overlay on top of PDF */}
            {watermarkData && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Watermark data={watermarkData} geoLocation={geoLocation} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/95 backdrop-blur-sm text-white px-4 flex items-center justify-between z-40 border-t border-slate-700">
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-slate-400">SECURE</span>
          </div>
          <span className="text-slate-300">{watermarkData?.user_name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{watermarkData?.organization}</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          {geoLocation && (
            <>
              <span className="text-emerald-400 font-mono">
                {geoLocation.latitude.toFixed(4)}, {geoLocation.longitude.toFixed(4)}
              </span>
              <span className="text-slate-500">•</span>
            </>
          )}
          <span className="text-slate-400">{watermarkData?.ip_address}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default SecureViewer;
