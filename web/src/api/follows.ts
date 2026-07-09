// api/follows.ts 模块，承载前端对应功能的页面、组件或请求封装。
import { request } from '../lib/request';
import type { UserPublicProfile } from './types';

export interface FollowState {
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
}

// 查询公开用户主页，携带 token 时后端会补充 viewer 关注状态。
export function getUserPublicProfile(id: number) {
  return request<UserPublicProfile>('/users/' + id + '/profile');
}

// 关注用户返回最新关注计数和 viewer 状态。
export function followUser(id: number) {
  return request<FollowState>('/users/' + id + '/follow', { method: 'POST' });
}

// 取消关注返回最终未关注状态。
export function unfollowUser(id: number) {
  return request<FollowState>('/users/' + id + '/follow', { method: 'DELETE' });
}
