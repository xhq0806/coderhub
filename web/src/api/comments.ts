// 评论 API 封装，负责评论、回复和删除评论请求。
import { request } from '../lib/request';
import type { CommentItem, CommentPayload, PageResult } from './types';

export function listComments(contentId: number, params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<CommentItem>>('/contents/' + contentId + '/comments', { params });
}

// by AI.Coding：回复列表按顶级评论独立分页，供楼中楼按需展开。
export function listReplies(rootCommentId: number, params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<CommentItem>>('/comments/' + rootCommentId + '/replies', { params });
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
