import { AUTH_SESSION_CLEARED_EVENT, clearStoredSession, readStoredSession } from '../auth/session';
import type { ApiCode } from '../api/types';

interface ApiEnvelope<T> {
  code: ApiCode;
  message: string;
  data: T;
}

type QueryValue = string | number | boolean | undefined | null;
type RequestPayload = object | FormData | undefined;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params?: object;
  body?: RequestPayload;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  code: ApiCode | number;
  httpStatus: number;
  data: unknown;

  constructor(message: string, code: ApiCode | number, httpStatus: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const authErrorCodes = new Set<number>([-1004, -1005]);

function normalizePath(path: string) {
  return path.startsWith('/') ? path : '/' + path;
}

function appendParams(url: string, params?: object) {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const queryValue = value as QueryValue;
    if (queryValue !== undefined && queryValue !== null && queryValue !== '') searchParams.set(key, String(queryValue));
  }
  const query = searchParams.toString();
  return query ? url + (url.includes('?') ? '&' : '?') + query : url;
}

function resolveUrl(path: string, params?: object) {
  if (/^https?:\/\//.test(path)) return appendParams(path, params);
  return appendParams(API_BASE_URL + normalizePath(path), params);
}

export function resolveAssetUrl(url: string | null | undefined) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return API_BASE_URL ? API_BASE_URL + normalizePath(url) : normalizePath(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEnvelope<T>(value: unknown): ApiEnvelope<T> | null {
  if (!isRecord(value) || typeof value.code !== 'number' || typeof value.message !== 'string') return null;
  return value as unknown as ApiEnvelope<T>;
}

function notifyAuthCleared(message: string) {
  clearStoredSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT, { detail: message }));
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const session = readStoredSession();
  if (session?.token) headers.set('Authorization', 'Bearer ' + session.token);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(resolveUrl(path, options.params), {
    method: options.method || 'GET',
    headers,
    body,
    signal: options.signal
  });

  const contentType = response.headers.get('content-type') || '';
  const rawPayload: unknown = contentType.includes('application/json') ? await response.json() : null;
  const envelope = parseEnvelope<T>(rawPayload);

  if (!response.ok || !envelope || envelope.code !== 0) {
    const code = envelope?.code ?? response.status;
    const message = envelope?.message || response.statusText || '请求失败';
    if (authErrorCodes.has(code)) notifyAuthCleared(message);
    throw new ApiError(message, code, response.status, envelope?.data);
  }

  return envelope.data;
}
