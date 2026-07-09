// 认证上下文，集中维护登录态、当前用户刷新和跨页面登出同步。
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, loginUser } from '../api/user';
import type { AuthSession, LoginPayload, UserProfile } from '../api/types';
import { AUTH_SESSION_CLEARED_EVENT, clearStoredSession, readStoredSession, saveStoredSession } from './session';

// 认证上下文暴露登录态、用户信息和会话操作方法。
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

// 认证 Provider 在应用启动时恢复本地会话，并向子组件提供认证能力。
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(() => Boolean(readStoredSession()?.token));

  // 持久化登录态，保证内存状态和 localStorage 同步。
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

  // 重新拉取当前用户资料，用于页面刷新后同步账号状态和头像信息。
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
