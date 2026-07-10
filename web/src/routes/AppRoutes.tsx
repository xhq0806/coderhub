// 前端路由表，集中声明用户端和管理端页面入口，并对页面组件做路由级懒加载。
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { Layout } from '../components/Layout';
import { StatusView } from '../components/StatusView';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })));
const DetailPage = lazy(() => import('../pages/DetailPage').then((module) => ({ default: module.DetailPage })));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage').then((module) => ({ default: module.UserProfilePage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const PublishPage = lazy(() => import('../pages/PublishPage').then((module) => ({ default: module.PublishPage })));
const MyContentsPage = lazy(() => import('../pages/MyContentsPage').then((module) => ({ default: module.MyContentsPage })));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminContentsPage = lazy(() => import('../pages/admin/AdminContentsPage').then((module) => ({ default: module.AdminContentsPage })));
const AdminCommentsPage = lazy(() => import('../pages/admin/AdminCommentsPage').then((module) => ({ default: module.AdminCommentsPage })));
const AdminTagsPage = lazy(() => import('../pages/admin/AdminTagsPage').then((module) => ({ default: module.AdminTagsPage })));
const AdminFilesPage = lazy(() => import('../pages/admin/AdminFilesPage').then((module) => ({ default: module.AdminFilesPage })));

// 应用路由表把公开页面、登录保护页面和管理端页面组织在一起。
export function AppRoutes() {
  return (
    <Suspense fallback={<StatusView state="loading" title="正在加载页面" />}>
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
    </Suspense>
  );
}
