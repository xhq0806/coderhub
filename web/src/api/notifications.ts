// api/notifications.ts 模块，承载前端对应功能的页面、组件或请求封装。
import { request } from '../lib/request';
import type { NotificationItem, NotificationStatus, PageResult } from './types';

export interface NotificationParams {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus | '';
}

// 通知 API 只操作当前登录用户自己的通知。
export function listNotifications(params: NotificationParams = {}) {
  return request<PageResult<NotificationItem>>('/notifications', { params });
}

// 查询未读数量，用于顶部导航角标。
export function getUnreadNotificationCount() {
  return request<{ unreadCount: number }>('/notifications/unread-count');
}

// 标记单条通知已读。
export function markNotificationRead(id: number) {
  return request<NotificationItem>('/notifications/' + id + '/read', { method: 'PATCH' });
}

// 批量标记全部通知已读。
export function markAllNotificationsRead() {
  return request<{ updated: number }>('/notifications/read-all', { method: 'PATCH' });
}
