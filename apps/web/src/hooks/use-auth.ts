'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import type { AuthSession, RegisterRequest, LoginRequest } from '@syncspace/types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, clear } = useAuthStore();
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ user: AuthSession['user'] | null }>('/api/auth/session');
      setUser(data.user);
    } catch {
      clear();
    }
  }, [setUser, setLoading, clear]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (input: LoginRequest) => {
    const data = await api.post<{ user: AuthSession['user']; expiresAt: string }>(
      '/api/auth/login',
      input,
    );
    setUser(data.user);
    router.push('/dashboard');
  };

  const register = async (input: RegisterRequest) => {
    await api.post<{ userId: string; email: string }>('/api/auth/register', input);
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    clear();
    router.push('/');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkSession,
  };
}
