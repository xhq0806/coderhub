// lib/request.ts 模块，承载前端对应功能的页面、组件或请求封装。
import { AUTH_SESSION_CLEARED_EVENT, clearStoredSession, readStoredSession, saveAuthNotice } from '../auth/session';
import type { ApiCode } from '../api/types';

// 后端统一响应信封，所有业务数据都包裹在 data 字段中。
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

// 接口异常对象保留业务错误码、HTTP 状态和原始数据，便于页面精确处理。
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

// 规范化请求路径，保证相对路径统一以斜杠开头。
function normalizePath(path: string) {
  return path.startsWith('/') ? path : '/' + path;
}

// 将查询参数追加到 URL，跳过空值以避免污染接口参数。
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

// 将后端返回的上传资源地址转换为浏览器可访问地址。
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

// 认证失效时先保存明确提示再清理 token，让登录页能解释跳转原因。
function notifyAuthCleared(message: string, code: number) {
  const notice = code === -1005 ? '账号已被禁用，请联系管理员处理。' : message;
  saveAuthNotice(notice);
  clearStoredSession();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT, { detail: notice }));
}

// 统一请求入口，自动携带登录 token、解析响应信封并转换业务错误。
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
    if (authErrorCodes.has(code)) notifyAuthCleared(message, code);
    throw new ApiError(message, code, response.status, envelope?.data);
  }

  return envelope.data;
}
