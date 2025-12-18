import apiClient from './client';
import type { Document, DocumentAccess, AuditLog, AccessLevel } from '../types';

export interface ListDocumentsParams {
  uploaded_by_me?: boolean;
  shared_with_me?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ListDocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GrantAccessParams {
  user_id?: string;
  group_id?: string;
  role_access?: string;
  access_level: AccessLevel;
  expires_at?: string;
  is_one_time?: boolean;
}

export const documentsApi = {
  // List documents
  list: async (params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> => {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  // Get document details
  get: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data.document;
  },

  // Upload document
  upload: async (title: string, description: string, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);

    const response = await apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.document;
  },

  // Update document metadata
  update: async (id: string, data: { title?: string; description?: string }): Promise<Document> => {
    const response = await apiClient.put(`/documents/${id}`, data);
    return response.data.document;
  },

  // Delete document
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Get access list
  getAccessList: async (id: string): Promise<DocumentAccess[]> => {
    const response = await apiClient.get(`/documents/${id}/access`);
    return response.data.access_list;
  },

  // Grant access
  grantAccess: async (id: string, data: GrantAccessParams): Promise<DocumentAccess> => {
    const response = await apiClient.post(`/documents/${id}/access`, data);
    return response.data.access;
  },

  // Revoke access
  revokeAccess: async (documentId: string, accessId: string): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}/access/${accessId}`);
  },

  // Get document logs
  getLogs: async (id: string, page = 1, pageSize = 20): Promise<{ logs: AuditLog[]; total: number }> => {
    const response = await apiClient.get(`/documents/${id}/logs`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },
};
