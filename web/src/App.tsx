// 应用根组件，集中接入全局认证上下文和路由表。
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { DialogProvider } from './components/DialogProvider';
import { ToastProvider } from './components/ToastProvider';
import { queryClient } from './lib/queryClient';
import { UnreadNotificationProvider } from './notifications/UnreadNotificationContext';
import { AppRoutes } from './routes/AppRoutes';
import './styles/admin.css';

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UnreadNotificationProvider>
            <DialogProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </DialogProvider>
          </UnreadNotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
