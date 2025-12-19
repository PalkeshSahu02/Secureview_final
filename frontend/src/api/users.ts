import apiClient from './client';
import type { User, Invitation, UserRole } from '../types';

export interface ListUsersParams {
  role?: UserRole;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UpdateUserParams {
  name?: string;
  role?: UserRole;
  employee_id?: string;
  is_active?: boolean;
}

export interface CreateInvitationParams {
  email: string;
  name?: string;
  role: UserRole;
}

export const usersApi = {
  // List users
  list: async (params: ListUsersParams = {}): Promise<ListUsersResponse> => {
    console.log('[Users] Listing users...', params);
    try {
      const response = await apiClient.get('/users', { params });
      console.log('[Users] Got users', { count: response.data.users?.length, total: response.data.total });
      return response.data;
    } catch (error) {
      console.error('[Users] Failed to list users', error);
      throw error;
    }
  },

  // Get user details
  get: async (id: string): Promise<User> => {
    console.log('[Users] Getting user...', { id });
    try {
      const response = await apiClient.get(`/users/${id}`);
      console.log('[Users] Got user', { email: response.data.user?.email });
      return response.data.user;
    } catch (error) {
      console.error('[Users] Failed to get user', error);
      throw error;
    }
  },

  // Update user
  update: async (id: string, data: UpdateUserParams): Promise<User> => {
    console.log('[Users] Updating user...', { id, data });
    try {
      const response = await apiClient.put(`/users/${id}`, data);
      console.log('[Users] User updated');
      return response.data.user;
    } catch (error) {
      console.error('[Users] Failed to update user', error);
      throw error;
    }
  },

  // Deactivate user
  deactivate: async (id: string): Promise<void> => {
    console.log('[Users] Deactivating user...', { id });
    try {
      await apiClient.delete(`/users/${id}`);
      console.log('[Users] User deactivated');
    } catch (error) {
      console.error('[Users] Failed to deactivate user', error);
      throw error;
    }
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    console.log('[Users] Getting profile...');
    try {
      const response = await apiClient.get('/profile');
      console.log('[Users] Got profile', { email: response.data.user?.email });
      return response.data.user;
    } catch (error) {
      console.error('[Users] Failed to get profile', error);
      throw error;
    }
  },

  // Update profile
  updateProfile: async (data: { name?: string; employee_id?: string }): Promise<User> => {
    console.log('[Users] Updating profile...', data);
    try {
      const response = await apiClient.put('/profile', data);
      console.log('[Users] Profile updated');
      return response.data.user;
    } catch (error) {
      console.error('[Users] Failed to update profile', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    console.log('[Users] Changing password...');
    try {
      await apiClient.post('/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      console.log('[Users] Password changed');
    } catch (error) {
      console.error('[Users] Failed to change password', error);
      throw error;
    }
  },

  // Change PIN
  changePIN: async (currentPIN: string, newPIN: string): Promise<void> => {
    console.log('[Users] Changing PIN...');
    try {
      await apiClient.post('/profile/pin', {
        current_pin: currentPIN,
        new_pin: newPIN,
      });
      console.log('[Users] PIN changed');
    } catch (error) {
      console.error('[Users] Failed to change PIN', error);
      throw error;
    }
  },

  // List invitations
  listInvitations: async (): Promise<Invitation[]> => {
    console.log('[Users] Listing invitations...');
    try {
      const response = await apiClient.get('/invitations');
      console.log('[Users] Got invitations', { count: response.data.invitations?.length });
      return response.data.invitations;
    } catch (error) {
      console.error('[Users] Failed to list invitations', error);
      throw error;
    }
  },

  // Create invitation
  createInvitation: async (data: CreateInvitationParams): Promise<Invitation> => {
    console.log('[Users] Creating invitation...', { email: data.email, role: data.role });
    try {
      const response = await apiClient.post('/invitations', data);
      console.log('[Users] Invitation created', { id: response.data.invitation?.id });
      return response.data.invitation;
    } catch (error) {
      console.error('[Users] Failed to create invitation', error);
      throw error;
    }
  },

  // Cancel invitation
  cancelInvitation: async (id: string): Promise<void> => {
    console.log('[Users] Canceling invitation...', { id });
    try {
      await apiClient.delete(`/invitations/${id}`);
      console.log('[Users] Invitation canceled');
    } catch (error) {
      console.error('[Users] Failed to cancel invitation', error);
      throw error;
    }
  },
};
