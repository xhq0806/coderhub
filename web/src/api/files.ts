// 文件 API 封装，负责头像和内容图片上传请求。
import { request } from '../lib/request';
import type { FileItem } from './types';

function uploadFile(path: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<FileItem>(path, { method: 'POST', body: formData });
}

export function uploadAvatar(file: File) {
  return uploadFile('/files/avatar', file);
}

export function uploadContentImage(file: File) {
  return uploadFile('/files/content-images', file);
}
