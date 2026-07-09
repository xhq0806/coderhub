// 用户 API 封装，负责注册、登录、当前用户资料和资料更新请求。
import { request } from '../lib/request';
import type { AuthSession, LoginPayload, RegisterPayload, UpdateProfilePayload, UserProfile } from './types';

export function registerUser(payload: RegisterPayload) {
  return request<{ id: number; name: string }>('/users', { method: 'POST', body: payload });
}

export function loginUser(payload: LoginPayload) {
  return request<AuthSession>('/login', { method: 'POST', body: payload });
}

export function getCurrentUser() {
  return request<UserProfile>('/users/me');
}

export function updateCurrentUser(payload: UpdateProfilePayload) {
  return request<UserProfile>('/users/me', { method: 'PATCH', body: payload as Record<string, unknown> });
}
