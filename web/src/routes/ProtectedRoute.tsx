import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { StatusView } from '../components/StatusView';

export function ProtectedRoute() {
  const location = useLocation();
  const { loading, session } = useAuth();

  if (loading) return <StatusView state="loading" title="正在确认登录状态" />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
