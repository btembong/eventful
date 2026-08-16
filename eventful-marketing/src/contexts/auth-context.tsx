'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// useLayoutEffect runs before paint on client; fall back to useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  avatarUrl?: string;
  emailVerifiedAt?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  logout: () => Promise<void>;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoaded: false,
  logout: async () => {},
  setAuth: () => {},
  refreshAccessToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router              = useRouter();

  useIsomorphicLayoutEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser  = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch { /* ignore malformed JSON */ }
    }
    setIsLoaded(true);
  }, []);

  const setAuth = useCallback((newUser: AuthUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token',  accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user',          JSON.stringify(newUser));
    // Mirror tokens in cookies so Next.js middleware can validate auth server-side.
    // refresh_token uses 30d TTL (matches JWT_REFRESH_TTL); access_token uses 15 min.
    document.cookie = `access_token=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    setUser(newUser);
    setToken(accessToken);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken = data.accessToken as string;
      localStorage.setItem('access_token', newToken);
      // Refresh the access_token cookie too
      document.cookie = `access_token=${newToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
      setToken(newToken);
      return newToken;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    const t = localStorage.getItem('access_token');
    if (t) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${t}` },
        });
      } catch { /* best-effort */ }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Expire cookies immediately
    document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'refresh_token=; path=/; max-age=0; SameSite=Lax';
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoaded, logout, setAuth, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Convenience: returns a fetch wrapper that automatically attaches Bearer token */
export function useApiFetch() {
  const { token, refreshAccessToken, logout } = useAuth();

  return useCallback(async (url: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers as HeadersInit | undefined);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    let res = await fetch(url, { ...init, headers });

    // Auto-refresh on 401
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(url, { ...init, headers });
      } else {
        await logout();
      }
    }

    return res;
  }, [token, refreshAccessToken, logout]);
}
