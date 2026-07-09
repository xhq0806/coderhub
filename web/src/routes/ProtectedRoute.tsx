// 登录路由守卫，未登录访问受保护页面时跳转登录并保留来源。
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { StatusView } from '../components/StatusView';

// 登录守卫在未登录时记录来源页面，方便登录后回跳。
export function ProtectedRoute() {
  const location = useLocation();
  const { loading, session } = useAuth();

  if (loading) return <StatusView state="loading" title="正在确认登录状态" />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
