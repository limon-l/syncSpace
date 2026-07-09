'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import type { AuthSession, RegisterRequest, LoginRequest } from '@syncspace/types';

let sessionCheckInFlight = false;

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, clear } = useAuthStore();
  const router = useRouter();
  const mountedRef = useRef(true);

  const checkSession = useCallback(async () => {
    if (sessionCheckInFlight) return;
    sessionCheckInFlight = true;
    try {
      setLoading(true);
      const data = await api.get<{ user: AuthSession['user'] | null }>('/api/auth/session');
      if (mountedRef.current) setUser(data.user);
    } catch {
      if (mountedRef.current) clear();
    } finally {
      sessionCheckInFlight = false;
    }
  }, [setUser, setLoading, clear]);

  useEffect(() => {
    mountedRef.current = true;
    checkSession();
    return () => { mountedRef.current = false; };
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
