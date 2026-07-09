// components/Layout.tsx 模块，承载前端对应功能的页面、组件或请求封装。
import { NavLink, Outlet } from 'react-router-dom';
import { Compass, FilePenLine, LibraryBig, LogIn, LogOut, PenSquare, Star, Bell, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '../api/notifications';

export function Layout() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // 登录用户进入应用时读取未读通知数量，用于顶部角标提示。
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    getUnreadNotificationCount().then((result) => setUnreadCount(result.unreadCount)).catch(() => setUnreadCount(0));
  }, [user]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="coderhub 首页">
          <span className="brand-mark">ch</span>
          <span className="brand-copy">
            <span>coderhub</span>
            <small>生活动态工作台</small>
          </span>
        </NavLink>
        <nav className="nav-links" aria-label="主导航">
          <NavLink to="/"><Compass size={17} />动态</NavLink>
          {user ? <NavLink to="/publish"><PenSquare size={17} />发布</NavLink> : null}
          {user ? <NavLink to="/my/contents"><LibraryBig size={17} />我的内容</NavLink> : null}
          {user ? <NavLink to="/my/favorites"><Star size={17} />收藏</NavLink> : null}
          {user ? <NavLink to="/notifications"><Bell size={17} />通知{unreadCount ? <span className="nav-badge" aria-label={'未读通知 ' + unreadCount}>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}</NavLink> : null}
          {user ? <NavLink to="/profile"><UserRound size={17} />资料</NavLink> : null}
        </nav>
        <div className="account-area">
          {user ? (
            <>
              <span className="account-name"><UserRound size={16} />{user.nickname || user.name}</span>
              <button className="button ghost icon-button" type="button" onClick={logout} aria-label="退出登录" title="退出登录">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <NavLink className="button ghost" to="/login"><LogIn size={17} />登录</NavLink>
              <NavLink className="button primary" to="/register"><FilePenLine size={17} />注册</NavLink>
            </>
          )}
        </div>
      </header>
      <div className="atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <main className="page-frame">
        <Outlet />
      </main>
    </div>
  );
}
