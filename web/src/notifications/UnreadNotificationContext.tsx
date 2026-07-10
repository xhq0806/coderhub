// by AI.Coding：未读通知 Context 兼容现有调用方，内部以 React Query 作为唯一状态真源。
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { getUnreadNotificationCount } from '../api/notifications';
import { useAuth } from '../auth/useAuth';
import { queryKeys } from '../lib/queryKeys';
import { connectNotificationStream } from './notificationStream';

interface UnreadNotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UnreadNotificationContext = createContext<UnreadNotificationContextValue | null>(null);

// by AI.Coding：私有未读数缓存按用户隔离，未登录时禁用请求并返回零。
export function UnreadNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unread(user?.id ?? 0),
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(user),
    staleTime: 15_000,
    meta: { private: true }
  });

  // by AI.Coding：登录期间只维持一个 SSE 生命周期，事件到达后失效通知相关缓存。
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    connectNotificationStream({
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type !== 'notification.created') return;
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread(user.id) });
      }
    });
    return () => controller.abort();
  }, [queryClient, user]);

  // by AI.Coding：保留原 refresh 接口，内部直接刷新 Query 缓存而不维护第二份状态。
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    await queryClient.refetchQueries({ queryKey: queryKeys.notifications.unread(user.id) });
  }, [queryClient, user]);

  const value = useMemo(() => ({ unreadCount: user ? unreadQuery.data?.unreadCount ?? 0 : 0, refreshUnreadCount }), [user, unreadQuery.data?.unreadCount, refreshUnreadCount]);
  return <UnreadNotificationContext.Provider value={value}>{children}</UnreadNotificationContext.Provider>;
}

// by AI.Coding：通知角标 Hook 必须在 Provider 内使用，避免静默返回错误状态。
export function useUnreadNotifications() {
  const value = useContext(UnreadNotificationContext);
  if (!value) throw new Error('useUnreadNotifications 必须在 UnreadNotificationProvider 内使用');
  return value;
}
