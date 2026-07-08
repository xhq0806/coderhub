import { ApiError } from './request';

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  return error instanceof ApiError ? error.message : fallback;
}
