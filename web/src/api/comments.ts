import { request } from '../lib/request';
import type { CommentItem, CommentPayload, PageResult } from './types';

export function listComments(contentId: number, params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<CommentItem>>('/contents/' + contentId + '/comments', { params });
}

export function createComment(contentId: number, payload: CommentPayload) {
  return request<CommentItem>('/contents/' + contentId + '/comments', { method: 'POST', body: payload });
}

export function createReply(commentId: number, payload: CommentPayload) {
  return request<CommentItem>('/comments/' + commentId + '/replies', { method: 'POST', body: payload });
}

export function deleteComment(commentId: number) {
  return request<{ id: number }>('/comments/' + commentId, { method: 'DELETE' });
}
