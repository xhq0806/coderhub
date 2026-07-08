import { request } from '../lib/request';
import type { PageResult, TagItem } from './types';

export function listTags(params: { page?: number; pageSize?: number } = {}) {
  return request<PageResult<TagItem>>('/tags', { params });
}
