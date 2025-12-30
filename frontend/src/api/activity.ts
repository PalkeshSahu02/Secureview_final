import apiClient from './client';

export interface ActivityLog {
  id: string;
  event_type: string;
  document_id?: string;
  user_id?: string;
  organization_id?: string;
  ip_address?: string;
  city?: string;
  country?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  document?: {
    id: string;
    title: string;
  };
}

export interface ListActivityParams {
  page?: number;
  page_size?: number;
  event_type?: string;
  document_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ListActivityResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const activityApi = {
  // List activity logs for organization
  list: async (params: ListActivityParams = {}): Promise<ListActivityResponse> => {
    console.log('[Activity] Listing logs...', params);
    try {
      const response = await apiClient.get('/activity', { params });
      console.log('[Activity] Got logs', { count: response.data.logs?.length, total: response.data.total });
      return response.data;
    } catch (error) {
      console.error('[Activity] Failed to list logs', error);
      throw error;
    }
  },

  // Get document-specific activity
  getDocumentActivity: async (documentId: string, params: ListActivityParams = {}): Promise<ListActivityResponse> => {
    console.log('[Activity] Getting document activity...', { documentId });
    try {
      const response = await apiClient.get(`/documents/${documentId}/activity`, { params });
      console.log('[Activity] Got document activity', { count: response.data.logs?.length });
      return response.data;
    } catch (error) {
      console.error('[Activity] Failed to get document activity', error);
      throw error;
    }
  },
};
