import type { AuthSession, UserProfile } from '../api/types';

const STORAGE_KEY = 'coderhub.auth.session';
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

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
