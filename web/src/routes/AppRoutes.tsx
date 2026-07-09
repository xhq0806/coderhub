// 前端路由表，集中声明用户端和管理端页面入口。
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { Layout } from '../components/Layout';
import { AdminCommentsPage } from '../pages/admin/AdminCommentsPage';
import { AdminContentsPage } from '../pages/admin/AdminContentsPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminFilesPage } from '../pages/admin/AdminFilesPage';
import { AdminTagsPage } from '../pages/admin/AdminTagsPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { DetailPage } from '../pages/DetailPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MyContentsPage } from '../pages/MyContentsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { PublishPage } from '../pages/PublishPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserProfilePage } from '../pages/UserProfilePage';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

// 应用路由表把公开页面、登录保护页面和管理端页面组织在一起。
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="contents/:id" element={<DetailPage />} />
        <Route path="users/:id" element={<UserProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="publish" element={<PublishPage />} />
          <Route path="my/contents" element={<MyContentsPage />} />
          <Route path="my/favorites" element={<FavoritesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<div className="surface"><h1>页面不存在</h1><p className="muted">请检查访问地址。</p></div>} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="contents" element={<AdminContentsPage />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="tags" element={<AdminTagsPage />} />
          <Route path="files" element={<AdminFilesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
