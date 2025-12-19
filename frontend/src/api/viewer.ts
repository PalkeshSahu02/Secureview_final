import apiClient from './client';
import type { ViewingSessionResponse, EventType } from '../types';

// Store the current viewing session token
let currentViewingSession: string | null = null;

export const setViewingSession = (token: string | null): void => {
  currentViewingSession = token;
};

export const getViewingSession = (): string | null => {
  return currentViewingSession;
};

export const viewerApi = {
  // Initialize viewing session
  initSession: async (documentId: string): Promise<ViewingSessionResponse> => {
    console.log('[Viewer] Initializing viewing session...', { documentId });
    try {
      const response = await apiClient.post(`/viewer/${documentId}/init`);
      const data = response.data;
      setViewingSession(data.session_token);
      console.log('[Viewer] Session initialized', {
        sessionToken: data.session_token?.substring(0, 8) + '...',
        pageCount: data.page_count,
        document: data.document?.title
      });
      return data;
    } catch (error) {
      console.error('[Viewer] Failed to initialize session', error);
      throw error;
    }
  },

  // Get document page
  getPage: async (documentId: string, pageNumber: number): Promise<Blob> => {
    console.log('[Viewer] Getting page...', { documentId, pageNumber, hasSession: !!currentViewingSession });
    try {
      const response = await apiClient.get(`/viewer/${documentId}/page/${pageNumber}`, {
        responseType: 'blob',
        headers: {
          'X-Viewing-Session': currentViewingSession || '',
        },
      });
      console.log('[Viewer] Got page', { pageNumber, blobSize: response.data.size, blobType: response.data.type });
      return response.data;
    } catch (error) {
      console.error('[Viewer] Failed to get page', { documentId, pageNumber, error });
      throw error;
    }
  },

  // Send heartbeat
  heartbeat: async (documentId: string, pageNumber?: number): Promise<void> => {
    console.log('[Viewer] Sending heartbeat...', { documentId, pageNumber });
    try {
      await apiClient.post(
        `/viewer/${documentId}/heartbeat`,
        { page_number: pageNumber },
        {
          headers: {
            'X-Viewing-Session': currentViewingSession || '',
          },
        }
      );
      console.log('[Viewer] Heartbeat sent');
    } catch (error) {
      console.error('[Viewer] Heartbeat failed', error);
      throw error;
    }
  },

  // Close viewing session
  closeSession: async (documentId: string): Promise<void> => {
    console.log('[Viewer] Closing session...', { documentId });
    try {
      await apiClient.post(
        `/viewer/${documentId}/close`,
        {},
        {
          headers: {
            'X-Viewing-Session': currentViewingSession || '',
          },
        }
      );
      console.log('[Viewer] Session closed');
    } catch (error) {
      console.error('[Viewer] Failed to close session', error);
    } finally {
      setViewingSession(null);
    }
  },

  // Report security event
  reportSecurityEvent: async (
    documentId: string,
    eventType: EventType,
    details?: Record<string, unknown>
  ): Promise<void> => {
    console.log('[Viewer] Reporting security event...', { documentId, eventType, details });
    try {
      await apiClient.post(
        `/viewer/${documentId}/security-event`,
        {
          event_type: eventType,
          details,
        },
        {
          headers: {
            'X-Viewing-Session': currentViewingSession || '',
          },
        }
      );
      console.log('[Viewer] Security event reported');
    } catch (error) {
      console.error('[Viewer] Failed to report security event', error);
    }
  },
};
