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
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  // Get user details
  get: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.user;
  },

  // Update user
  update: async (id: string, data: UpdateUserParams): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.user;
  },

  // Deactivate user
  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/profile');
    return response.data.user;
  },

  // Update profile
  updateProfile: async (data: { name?: string; employee_id?: string }): Promise<User> => {
    const response = await apiClient.put('/profile', data);
    return response.data.user;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/profile/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  // Change PIN
  changePIN: async (currentPIN: string, newPIN: string): Promise<void> => {
    await apiClient.post('/profile/pin', {
      current_pin: currentPIN,
      new_pin: newPIN,
    });
  },

  // List invitations
  listInvitations: async (): Promise<Invitation[]> => {
    const response = await apiClient.get('/invitations');
    return response.data.invitations;
  },

  // Create invitation
  createInvitation: async (data: CreateInvitationParams): Promise<Invitation> => {
    const response = await apiClient.post('/invitations', data);
    return response.data.invitation;
  },

  // Cancel invitation
  cancelInvitation: async (id: string): Promise<void> => {
    await apiClient.delete(`/invitations/${id}`);
  },
};
