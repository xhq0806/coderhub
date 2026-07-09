// 管理端布局组件，提供后台导航、退出登录和页面框架。
import { NavLink, Outlet } from 'react-router-dom';
import { Files, Gauge, LogOut, MessageSquareWarning, Newspaper, Shield, Tags, UsersRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

const links = [
  { to: '/admin', label: '总览', icon: Gauge, end: true },
  { to: '/admin/users', label: '用户', icon: UsersRound },
  { to: '/admin/contents', label: '内容', icon: Newspaper },
  { to: '/admin/comments', label: '评论', icon: MessageSquareWarning },
  { to: '/admin/tags', label: '标签', icon: Tags },
  { to: '/admin/files', label: '文件', icon: Files }
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span><Shield size={22} /></span>
          <div>
            <strong>治理控制塔</strong>
            <small>coderhub admin</small>
          </div>
        </div>
        <nav className="admin-nav" aria-label="管理端导航">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="admin-operator">
          <span>管理员</span>
          <strong>{user?.nickname || user?.name}</strong>
          <button className="button admin-ghost" type="button" onClick={logout}><LogOut size={17} />退出</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
