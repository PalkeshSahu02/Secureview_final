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
    const response = await apiClient.post(`/viewer/${documentId}/init`);
    const data = response.data;
    setViewingSession(data.session_token);
    return data;
  },

  // Get document page
  getPage: async (documentId: string, pageNumber: number): Promise<Blob> => {
    const response = await apiClient.get(`/viewer/${documentId}/page/${pageNumber}`, {
      responseType: 'blob',
      headers: {
        'X-Viewing-Session': currentViewingSession || '',
      },
    });
    return response.data;
  },

  // Send heartbeat
  heartbeat: async (documentId: string, pageNumber?: number): Promise<void> => {
    await apiClient.post(
      `/viewer/${documentId}/heartbeat`,
      { page_number: pageNumber },
      {
        headers: {
          'X-Viewing-Session': currentViewingSession || '',
        },
      }
    );
  },

  // Close viewing session
  closeSession: async (documentId: string): Promise<void> => {
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
  },
};
