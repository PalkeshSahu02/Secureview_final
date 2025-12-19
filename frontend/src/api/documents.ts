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
    console.log('[Documents] Listing documents...', params);
    try {
      const response = await apiClient.get('/documents', { params });
      console.log('[Documents] Got documents', { count: response.data.documents?.length, total: response.data.total });
      return response.data;
    } catch (error) {
      console.error('[Documents] Failed to list documents', error);
      throw error;
    }
  },

  // Get document details
  get: async (id: string): Promise<Document> => {
    console.log('[Documents] Getting document...', { id });
    try {
      const response = await apiClient.get(`/documents/${id}`);
      console.log('[Documents] Got document', { title: response.data.document?.title });
      return response.data.document;
    } catch (error) {
      console.error('[Documents] Failed to get document', error);
      throw error;
    }
  },

  // Upload document
  upload: async (title: string, description: string, file: File): Promise<Document> => {
    console.log('[Documents] Uploading document...', { title, fileName: file.name, fileSize: file.size, fileType: file.type });
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);

      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[Documents] Upload successful', { id: response.data.document?.id, title: response.data.document?.title });
      return response.data.document;
    } catch (error) {
      console.error('[Documents] Upload failed', error);
      throw error;
    }
  },

  // Update document metadata
  update: async (id: string, data: { title?: string; description?: string }): Promise<Document> => {
    console.log('[Documents] Updating document...', { id, data });
    try {
      const response = await apiClient.put(`/documents/${id}`, data);
      console.log('[Documents] Update successful');
      return response.data.document;
    } catch (error) {
      console.error('[Documents] Update failed', error);
      throw error;
    }
  },

  // Delete document
  delete: async (id: string): Promise<void> => {
    console.log('[Documents] Deleting document...', { id });
    try {
      await apiClient.delete(`/documents/${id}`);
      console.log('[Documents] Delete successful');
    } catch (error) {
      console.error('[Documents] Delete failed', error);
      throw error;
    }
  },

  // Get access list
  getAccessList: async (id: string): Promise<DocumentAccess[]> => {
    console.log('[Documents] Getting access list...', { id });
    try {
      const response = await apiClient.get(`/documents/${id}/access`);
      console.log('[Documents] Got access list', { count: response.data.access_list?.length });
      return response.data.access_list;
    } catch (error) {
      console.error('[Documents] Failed to get access list', error);
      throw error;
    }
  },

  // Grant access
  grantAccess: async (id: string, data: GrantAccessParams): Promise<DocumentAccess> => {
    console.log('[Documents] Granting access...', { id, data });
    try {
      const response = await apiClient.post(`/documents/${id}/access`, data);
      console.log('[Documents] Access granted');
      return response.data.access;
    } catch (error) {
      console.error('[Documents] Failed to grant access', error);
      throw error;
    }
  },

  // Revoke access
  revokeAccess: async (documentId: string, accessId: string): Promise<void> => {
    console.log('[Documents] Revoking access...', { documentId, accessId });
    try {
      await apiClient.delete(`/documents/${documentId}/access/${accessId}`);
      console.log('[Documents] Access revoked');
    } catch (error) {
      console.error('[Documents] Failed to revoke access', error);
      throw error;
    }
  },

  // Get document logs
  getLogs: async (id: string, page = 1, pageSize = 20): Promise<{ logs: AuditLog[]; total: number }> => {
    console.log('[Documents] Getting logs...', { id, page, pageSize });
    try {
      const response = await apiClient.get(`/documents/${id}/logs`, {
        params: { page, page_size: pageSize },
      });
      console.log('[Documents] Got logs', { count: response.data.logs?.length, total: response.data.total });
      return response.data;
    } catch (error) {
      console.error('[Documents] Failed to get logs', error);
      throw error;
    }
  },
};
