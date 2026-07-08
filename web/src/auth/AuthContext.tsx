import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, loginUser } from '../api/user';
import type { AuthSession, LoginPayload, UserProfile } from '../api/types';
import { AUTH_SESSION_CLEARED_EVENT, clearStoredSession, readStoredSession, saveStoredSession } from './session';

interface AuthContextValue {
  session: AuthSession | null;
  user: UserProfile | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  updateUser: (user: UserProfile, avatarUrl?: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(() => Boolean(readStoredSession()?.token));

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
    if (nextSession) saveStoredSession(nextSession);
    else clearStoredSession();
  }, []);

  const logout = useCallback(() => {
    persistSession(null);
  }, [persistSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await loginUser(payload);
    persistSession(nextSession);
  }, [persistSession]);

  const refreshMe = useCallback(async () => {
    const current = readStoredSession();
    if (!current?.token) return;
    const user = await getCurrentUser();
    const avatarUrl = current.user.avatarFileId === user.avatarFileId ? current.avatarUrl : undefined;
    persistSession({ ...current, user, avatarUrl });
  }, [persistSession]);

  const updateUser = useCallback((user: UserProfile, avatarUrl?: string) => {
    setSession((current) => {
      if (!current) return current;
      const nextSession = { ...current, user, avatarUrl };
      saveStoredSession(nextSession);
      return nextSession;
    });
  }, []);

  useEffect(() => {
    const current = readStoredSession();
    if (!current?.token) {
      setLoading(false);
      return;
    }

    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  useEffect(() => {
    const handleCleared = () => {
      setSession(null);
    };
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleCleared);
    return () => window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleCleared);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    login,
    logout,
    refreshMe,
    updateUser
  }), [session, loading, login, logout, refreshMe, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
