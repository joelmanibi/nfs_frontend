'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const COOKIE_TOKEN = 'nfs_token';
const COOKIE_USER  = 'nfs_user';
const COOKIE_OPTS  = { expires: 1 / 12, sameSite: 'Strict' }; // ~2 h

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false); // hydration guard

  // ── Rehydrate from cookie on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = Cookies.get(COOKIE_USER);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      Cookies.remove(COOKIE_USER);
    } finally {
      setReady(true);
    }
  }, []);

  // ── Called after successful OTP verification ────────────────────────────────
  const login = useCallback((token, userData) => {
    Cookies.set(COOKIE_TOKEN, token, COOKIE_OPTS);
    Cookies.set(COOKIE_USER, JSON.stringify(userData), COOKIE_OPTS);
    setUser(userData);
    router.push('/dashboard');
  }, [router]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    Cookies.remove(COOKIE_TOKEN);
    Cookies.remove(COOKIE_USER);
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAuthenticated = Boolean(user && Cookies.get(COOKIE_TOKEN));

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

