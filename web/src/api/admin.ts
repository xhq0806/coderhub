import { request } from '../lib/request';
import type { CommentItem, ContentItem, ContentStatus, FileItem, FileUsageType, PageResult, TagItem, UserProfile, UserStatus } from './types';

export interface AdminPageParams {
  page?: number;
  pageSize?: number;
}

export interface AdminUserParams extends AdminPageParams {
  status?: UserStatus | '';
}

export interface AdminContentParams extends AdminPageParams {
  status?: ContentStatus | '';
}

export interface AdminCommentParams extends AdminPageParams {
  contentId?: number;
}

export interface AdminFileParams extends AdminPageParams {
  usageType?: FileUsageType | '';
}

export interface AdminTagParams extends AdminPageParams {
  status?: string;
}

export function listAdminUsers(params: AdminUserParams = {}) {
  return request<PageResult<UserProfile>>('/admin/users', { params });
}

export function disableAdminUser(id: number) {
  return request<UserProfile>('/admin/users/' + id + '/disable', { method: 'PATCH' });
}

export function enableAdminUser(id: number) {
  return request<UserProfile>('/admin/users/' + id + '/enable', { method: 'PATCH' });
}

export function listAdminContents(params: AdminContentParams = {}) {
  return request<PageResult<ContentItem>>('/admin/contents', { params });
}

export function approveAdminContent(id: number) {
  return request<ContentItem>('/admin/contents/' + id + '/approve', { method: 'PATCH' });
}

export function rejectAdminContent(id: number, reason: string) {
  return request<ContentItem>('/admin/contents/' + id + '/reject', { method: 'PATCH', body: { reason } });
}

export function offlineAdminContent(id: number) {
  return request<ContentItem>('/admin/contents/' + id + '/offline', { method: 'PATCH' });
}

export function deleteAdminContent(id: number) {
  return request<ContentItem>('/admin/contents/' + id, { method: 'DELETE' });
}

export function listAdminComments(params: AdminCommentParams = {}) {
  return request<PageResult<CommentItem>>('/admin/comments', { params });
}

export function deleteAdminComment(id: number) {
  return request<CommentItem>('/admin/comments/' + id, { method: 'DELETE' });
}

export function listAdminTags(params: AdminTagParams = {}) {
  return request<PageResult<TagItem>>('/admin/tags', { params });
}

export function createAdminTag(name: string) {
  return request<TagItem>('/admin/tags', { method: 'POST', body: { name } });
}

export function updateAdminTag(id: number, name: string) {
  return request<TagItem>('/admin/tags/' + id, { method: 'PATCH', body: { name } });
}

export function enableAdminTag(id: number) {
  return request<TagItem>('/admin/tags/' + id + '/enable', { method: 'PATCH' });
}

export function disableAdminTag(id: number) {
  return request<TagItem>('/admin/tags/' + id + '/disable', { method: 'PATCH' });
}

export function listAdminFiles(params: AdminFileParams = {}) {
  return request<PageResult<FileItem>>('/admin/files', { params });
}

export function deleteAdminFile(id: number) {
  return request<FileItem>('/admin/files/' + id, { method: 'DELETE' });
}
