// 内容 API 封装，负责公开内容、我的内容、用户主页内容和发布编辑请求。
import { request } from '../lib/request';
import type { ContentDetail, ContentItem, ContentPayload, ListContentParams, PageResult } from './types';

export function listPublishedContents(params: ListContentParams = {}) {
  return request<PageResult<ContentItem>>('/contents', { params });
}

export function getPublishedContent(id: number) {
  return request<ContentDetail>('/contents/' + id);
}

export function listMyContents(params: ListContentParams = {}) {
  return request<PageResult<ContentItem>>('/users/me/contents', { params });
}

export function getMyContent(id: number) {
  return request<ContentDetail>('/users/me/contents/' + id);
}

export function listUserContents(userId: number, params: ListContentParams = {}) {
  return request<PageResult<ContentItem>>('/users/' + userId + '/contents', { params });
}

export function createContent(payload: ContentPayload) {
  return request<ContentDetail>('/contents', { method: 'POST', body: payload as Record<string, unknown> });
}

export function updateMyContent(id: number, payload: ContentPayload) {
  return request<ContentDetail>('/contents/' + id, { method: 'PATCH', body: payload as Record<string, unknown> });
}

export function deleteMyContent(id: number) {
  return request<{ id: number }>('/contents/' + id, { method: 'DELETE' });
}
