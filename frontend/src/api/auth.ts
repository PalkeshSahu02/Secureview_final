import apiClient, { setTokens, clearTokens } from './client';
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyPINRequest,
  AcceptInvitationRequest,
  Invitation,
} from '../types';

export const authApi = {
  // Register a new organization
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/register', data);
    const { access_token, refresh_token, ...rest } = response.data;
    setTokens(access_token, refresh_token);
    return rest;
  },

  // Login with email and password
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    const { access_token, refresh_token, ...rest } = response.data;
    setTokens(access_token, refresh_token);
    return { ...rest, access_token, refresh_token };
  },

  // Verify PIN
  verifyPIN: async (data: VerifyPINRequest): Promise<void> => {
    await apiClient.post('/auth/verify-pin', data);
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  // Get invitation details
  getInvitation: async (token: string): Promise<Invitation> => {
    const response = await apiClient.get(`/auth/invitations/${token}`);
    return response.data.invitation;
  },

  // Accept invitation
  acceptInvitation: async (data: AcceptInvitationRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/invitations/accept', data);
    const { access_token, refresh_token, ...rest } = response.data;
    setTokens(access_token, refresh_token);
    return rest;
  },

  // Refresh tokens
  refreshTokens: async (refreshToken: string): Promise<{ access_token: string; refresh_token: string }> => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};
