'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    city?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      phone: string;
      address: string;
      city?: string;
    }) => {
      const result = await api<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(result.user);
      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      isAdmin: user?.role === 'SUPER_ADMIN',
      isStaff: user?.role === 'SUPER_ADMIN' || user?.role === 'CASHIER',
      isCustomer: user?.role === 'CUSTOMER',
    }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function homeForRole(role: User['role']) {
  if (role === 'CUSTOMER') return '/shop/dashboard';
  if (role === 'SUPER_ADMIN') return '/admin/dashboard';
  return '/pos';
}
