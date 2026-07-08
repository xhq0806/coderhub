import { NavLink, Outlet } from 'react-router-dom';
import { Compass, FilePenLine, LibraryBig, LogIn, LogOut, PenSquare, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

export function Layout() {
  const { user, logout } = useAuth();

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
