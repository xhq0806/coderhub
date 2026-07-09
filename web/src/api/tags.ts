// 标签 API 封装，负责读取前台可用标签。
import { request } from '../lib/request';
import type { PageResult, TagItem } from './types';

export function listTags(params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<TagItem>>('/tags', { params });
}
