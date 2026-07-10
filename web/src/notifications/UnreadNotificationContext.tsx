// 未读通知上下文集中管理顶部角标，避免 Layout 和通知页各自维护副本。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getUnreadNotificationCount } from '../api/notifications';
import { useAuth } from '../auth/useAuth';

interface UnreadNotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UnreadNotificationContext = createContext<UnreadNotificationContextValue | null>(null);

export function UnreadNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const result = await getUnreadNotificationCount();
      setUnreadCount(result.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({ unreadCount, refreshUnreadCount }), [unreadCount, refreshUnreadCount]);

  return <UnreadNotificationContext.Provider value={value}>{children}</UnreadNotificationContext.Provider>;
}

export function useUnreadNotifications() {
  const value = useContext(UnreadNotificationContext);
  if (!value) throw new Error('useUnreadNotifications 必须在 UnreadNotificationProvider 内使用');
  return value;
}
