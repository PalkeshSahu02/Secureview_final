import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginRequest, RegisterRequest, AcceptInvitationRequest } from '../types';
import { authApi } from '../api/auth';
import { getAccessToken, clearTokens } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPINVerified: boolean;
  sessionId: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  verifyPIN: (pin: string) => Promise<void>;
  acceptInvitation: (data: AcceptInvitationRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPINVerified, setIsPINVerified] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Initialize from sessionStorage on first load
    return sessionStorage.getItem('session_id');
  });

  const isAuthenticated = !!user && !!getAccessToken();

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          // Check if PIN is already verified (stored in session)
          const storedPINVerified = sessionStorage.getItem('pin_verified');
          if (storedPINVerified === 'true') {
            setIsPINVerified(true);
          }
          // Restore session ID from storage
          const storedSessionId = sessionStorage.getItem('session_id');
          if (storedSessionId) {
            setSessionId(storedSessionId);
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          clearTokens();
          sessionStorage.removeItem('session_id');
          sessionStorage.removeItem('pin_verified');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    setUser(response.user);
    setSessionId(response.session_id);
    // Persist session ID to sessionStorage
    sessionStorage.setItem('session_id', response.session_id);
    setIsPINVerified(false);
    sessionStorage.removeItem('pin_verified');
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    setUser(response.user);
    setIsPINVerified(true); // PIN is set during registration
    sessionStorage.setItem('pin_verified', 'true');
  }, []);

  const verifyPIN = useCallback(async (pin: string) => {
    if (!sessionId) {
      throw new Error('No session to verify PIN for');
    }
    await authApi.verifyPIN({ pin, session_id: sessionId });
    setIsPINVerified(true);
    sessionStorage.setItem('pin_verified', 'true');
  }, [sessionId]);

  const acceptInvitation = useCallback(async (data: AcceptInvitationRequest) => {
    const response = await authApi.acceptInvitation(data);
    setUser(response.user);
    setIsPINVerified(true);
    sessionStorage.setItem('pin_verified', 'true');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsPINVerified(false);
      setSessionId(null);
      sessionStorage.removeItem('session_id');
      sessionStorage.removeItem('pin_verified');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isPINVerified,
    sessionId,
    login,
    register,
    verifyPIN,
    acceptInvitation,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
