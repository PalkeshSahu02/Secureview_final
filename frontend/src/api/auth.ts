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
    console.log('[Auth] Registering new organization...', { email: data.email, org: data.organization_name });
    try {
      const response = await apiClient.post('/auth/register', data);
      const { access_token, refresh_token, ...rest } = response.data;
      setTokens(access_token, refresh_token);
      console.log('[Auth] Registration successful', { user: rest.user?.email, session_id: rest.session_id });
      return rest;
    } catch (error) {
      console.error('[Auth] Registration failed', error);
      throw error;
    }
  },

  // Login with email and password
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    console.log('[Auth] Logging in...', { email: data.email });
    try {
      const response = await apiClient.post('/auth/login', data);
      const { access_token, refresh_token, ...rest } = response.data;
      setTokens(access_token, refresh_token);
      console.log('[Auth] Login successful', { user: rest.user?.email, session_id: rest.session_id });
      return { ...rest, access_token, refresh_token };
    } catch (error) {
      console.error('[Auth] Login failed', error);
      throw error;
    }
  },

  // Verify PIN
  verifyPIN: async (data: VerifyPINRequest): Promise<void> => {
    console.log('[Auth] Verifying PIN...', { session_id: data.session_id });
    try {
      await apiClient.post('/auth/verify-pin', data);
      console.log('[Auth] PIN verified successfully');
    } catch (error) {
      console.error('[Auth] PIN verification failed', error);
      throw error;
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    console.log('[Auth] Logging out...');
    try {
      await apiClient.post('/auth/logout');
      console.log('[Auth] Logout successful');
    } finally {
      clearTokens();
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    console.log('[Auth] Getting current user...');
    try {
      const response = await apiClient.get('/auth/me');
      console.log('[Auth] Got current user', { email: response.data.user?.email });
      return response.data.user;
    } catch (error) {
      console.error('[Auth] Failed to get current user', error);
      throw error;
    }
  },

  // Get invitation details
  getInvitation: async (token: string): Promise<Invitation> => {
    console.log('[Auth] Getting invitation details...', { token: token.substring(0, 8) + '...' });
    try {
      const response = await apiClient.get(`/auth/invitations/${token}`);
      console.log('[Auth] Got invitation', { email: response.data.invitation?.email });
      return response.data.invitation;
    } catch (error) {
      console.error('[Auth] Failed to get invitation', error);
      throw error;
    }
  },

  // Accept invitation
  acceptInvitation: async (data: AcceptInvitationRequest): Promise<RegisterResponse> => {
    console.log('[Auth] Accepting invitation...');
    try {
      const response = await apiClient.post('/auth/invitations/accept', data);
      const { access_token, refresh_token, ...rest } = response.data;
      setTokens(access_token, refresh_token);
      console.log('[Auth] Invitation accepted', { user: rest.user?.email, session_id: rest.session_id });
      return rest;
    } catch (error) {
      console.error('[Auth] Failed to accept invitation', error);
      throw error;
    }
  },

  // Refresh tokens
  refreshTokens: async (refreshToken: string): Promise<{ access_token: string; refresh_token: string }> => {
    console.log('[Auth] Refreshing tokens...');
    try {
      const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
      console.log('[Auth] Tokens refreshed successfully');
      return response.data;
    } catch (error) {
      console.error('[Auth] Failed to refresh tokens', error);
      throw error;
    }
  },
};
