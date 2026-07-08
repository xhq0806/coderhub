import type { AuthSession, UserProfile } from '../api/types';

// by AI.Coding：集中维护前端登录态存储键，便于认证失效时跨页面传递明确提示。
const STORAGE_KEY = 'coderhub.auth.session';
export const AUTH_NOTICE_KEY = 'coderhub.auth.notice';
export const AUTH_SESSION_CLEARED_EVENT = 'coderhub:auth-session-cleared';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserProfile(value: unknown): value is UserProfile {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string';
}

export function readStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.token !== 'string' || !isUserProfile(parsed.user)) return null;
    return {
      token: parsed.token,
      user: parsed.user,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : undefined
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// by AI.Coding：清理登录态时只删除 token，不清理提示，避免账号禁用原因在跳转登录页前丢失。
export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

// by AI.Coding：保存认证失效提示，供登录页在路由跳转或状态刷新后稳定展示。
export function saveAuthNotice(message: string) {
  window.localStorage.setItem(AUTH_NOTICE_KEY, message);
}

// by AI.Coding：读取并消费一次性认证提示，避免用户后续正常登录时重复看到旧提示。
export function consumeAuthNotice() {
  const message = window.localStorage.getItem(AUTH_NOTICE_KEY) || '';
  if (message) window.localStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}
