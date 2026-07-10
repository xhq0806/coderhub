// 应用根组件，集中接入全局认证上下文和路由表。
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import { UnreadNotificationProvider } from './notifications/UnreadNotificationContext';
import { AppRoutes } from './routes/AppRoutes';
import './styles/admin.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnreadNotificationProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </UnreadNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
