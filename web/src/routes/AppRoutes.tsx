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
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MyContentsPage } from '../pages/MyContentsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { PublishPage } from '../pages/PublishPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="contents/:id" element={<DetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="publish" element={<PublishPage />} />
          <Route path="my/contents" element={<MyContentsPage />} />
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
