// by AI.Coding：文件 API 使用 XHR 提供真实上传进度，同时保持统一认证和错误模型。
import { readStoredSession } from '../auth/session';
import { ApiError, notifyAuthCleared, resolveApiUrl } from '../lib/request';
import type { FileItem } from './types';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: (percentage: number) => void;
}

// by AI.Coding：仅上传使用 XHR，普通 JSON 请求继续复用 request.ts 的 fetch 实现。
function uploadFile(path: string, file: File, options: UploadOptions = {}) {
  return new Promise<FileItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    xhr.open('POST', resolveApiUrl(path));
    const session = readStoredSession();
    if (session?.token) xhr.setRequestHeader('Authorization', 'Bearer ' + session.token);

    // by AI.Coding：lengthComputable 时将字节进度归一化为 0–100。
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    let abortHandler: (() => void) | null = null;
    const cleanupAbortListener = () => {
      if (options.signal && abortHandler) options.signal.removeEventListener('abort', abortHandler);
    };
    xhr.onerror = () => {
      cleanupAbortListener();
      reject(new ApiError('上传失败，请检查网络连接', xhr.status || 0, xhr.status || 0));
    };
    xhr.onabort = () => {
      cleanupAbortListener();
      reject(new DOMException('上传已取消', 'AbortError'));
    };
    xhr.onload = () => {
      cleanupAbortListener();
      let envelope: ApiEnvelope<FileItem> | null = null;
      try {
        envelope = JSON.parse(xhr.responseText) as ApiEnvelope<FileItem>;
      } catch {
        envelope = null;
      }
      const code = envelope?.code ?? xhr.status;
      const message = envelope?.message || xhr.statusText || '上传失败';
      if (xhr.status < 200 || xhr.status >= 300 || !envelope || code !== 0) {
        if (code === -1004 || code === -1005) notifyAuthCleared(message, code);
        reject(new ApiError(message, code, xhr.status, envelope?.data));
        return;
      }
      options.onProgress?.(100);
      resolve(envelope.data);
    };
    if (options.signal) {
      abortHandler = () => xhr.abort();
      if (options.signal.aborted) xhr.abort();
      else options.signal.addEventListener('abort', abortHandler, { once: true });
    }
    xhr.send(formData);
  });
}

// by AI.Coding：头像上传暴露可选进度和取消参数。
export function uploadAvatar(file: File, options?: UploadOptions) {
  return uploadFile('/files/avatar', file, options);
}

// by AI.Coding：内容图片上传暴露可选进度和取消参数。
export function uploadContentImage(file: File, options?: UploadOptions) {
  return uploadFile('/files/content-images', file, options);
}
