'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false); // hydration guard

  const hydrateSession = useCallback(async () => {
    const { data } = await authAPI.getMe();
    const currentUser = data?.user || null;

    setUser(currentUser);
    return currentUser;
  }, []);

  // ── Rehydrate from backend session on mount ────────────────────────────────
  useEffect(() => {
    let active = true;

    const handleAuthLogout = () => {
      if (active) setUser(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    (async () => {
      try {
        await hydrateSession();
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [hydrateSession]);

  // ── Called after successful authentication ─────────────────────────────────
  const login = useCallback(async (userData = null) => {
    let currentUser = userData;

    if (userData) {
      setUser(userData);
    } else {
      currentUser = await hydrateSession();
    }

    router.push(currentUser?.mustChangePassword ? '/change-password' : '/dashboard');
  }, [hydrateSession, router]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume the auth context. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

