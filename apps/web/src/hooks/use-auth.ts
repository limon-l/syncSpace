'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import type { AuthSession, RegisterRequest, LoginRequest } from '@syncspace/types';

let pendingSessionCheck: Promise<void> | null = null;

export function useAuth(opts?: { skipInitialCheck?: boolean }) {
  const { user, isAuthenticated, isLoading, setUser, setLoading, clear } = useAuthStore();
  const router = useRouter();
  const mountedRef = useRef(true);

  const checkSession = useCallback(async () => {
    if (pendingSessionCheck) return pendingSessionCheck;
    if (useAuthStore.getState().isAuthenticated) return;
    const p = (async () => {
      setLoading(true);
      try {
        const data = await api.get<{ user: AuthSession['user'] | null }>('/api/auth/session');
        if (mountedRef.current) setUser(data.user);
      } catch {
        if (mountedRef.current) clear();
      }
    })();
    pendingSessionCheck = p;
    await p;
    pendingSessionCheck = null;
  }, [setUser, setLoading, clear]);

  useEffect(() => {
    if (opts?.skipInitialCheck) return;
    mountedRef.current = true;
    checkSession();
    return () => { mountedRef.current = false; };
  }, [checkSession, opts?.skipInitialCheck]);

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
