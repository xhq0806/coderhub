import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { StatusView } from '../components/StatusView';

export function AdminRoute() {
  const location = useLocation();
  const { loading, user } = useAuth();

  if (loading) return <StatusView state="loading" title="正在确认管理员身份" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== 'admin') {
    return (
      <StatusView
        state="error"
        title="无权限访问管理端"
        message="当前账号不是管理员，无法进入治理控制台。"
        action={<a className="button ghost" href="/"><ShieldAlert size={17} />返回用户端</a>}
      />
    );
  }

  return <Outlet />;
}
