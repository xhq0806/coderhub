// api/interactions.ts 模块，承载前端对应功能的页面、组件或请求封装。
import { request } from '../lib/request';
import type { ContentInteractionState, ContentItem, PageResult } from './types';

// 互动 API 集中封装点赞、收藏和我的收藏列表，页面不直接拼接请求细节。
export function likeContent(id: number) {
  return request<ContentInteractionState>('/contents/' + id + '/likes', { method: 'POST' });
}

// 取消点赞返回服务端最终互动状态，避免前端自行推算计数。
export function unlikeContent(id: number) {
  return request<ContentInteractionState>('/contents/' + id + '/likes', { method: 'DELETE' });
}

// 收藏内容后返回最新互动状态，供卡片和详情页同步展示。
export function favoriteContent(id: number) {
  return request<ContentInteractionState>('/contents/' + id + '/favorites', { method: 'POST' });
}

// 取消收藏保持幂等，页面以响应状态为准。
export function unfavoriteContent(id: number) {
  return request<ContentInteractionState>('/contents/' + id + '/favorites', { method: 'DELETE' });
}

// 我的收藏列表只展示仍公开的内容。
export function listFavoriteContents(params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<ContentItem>>('/users/me/favorites', { params });
}
