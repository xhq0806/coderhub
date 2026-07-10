// by AI.Coding：QueryClient 统一服务端状态缓存、重试边界和私有查询清理策略。
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './request';

// by AI.Coding：业务/认证类 4xx 不重试，仅网络错误和服务端错误重试一次。
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  return !(error instanceof ApiError) || error.httpStatus >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
});

// by AI.Coding：私有查询通过 meta 标记删除，避免登出时清空公开内容缓存。
export function removePrivateQueries(client: QueryClient = queryClient) {
  client.removeQueries({ predicate: (query) => query.meta?.private === true });
}
