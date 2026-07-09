// lib/errors.ts 模块，承载前端对应功能的页面、组件或请求封装。
import { ApiError } from './request';

export const FORBIDDEN_CODE = -1006;
export const DISABLED_ACCOUNT_CODE = -1005;

// 统一判断后台无权限错误，管理端可据此展示专门的权限状态页。
export function isForbiddenError(error: unknown) {
  return error instanceof ApiError && error.code === FORBIDDEN_CODE;
}

// 统一判断账号禁用错误，登录态清理后仍能展示明确禁用原因。
export function isDisabledAccountError(error: unknown) {
  return error instanceof ApiError && error.code === DISABLED_ACCOUNT_CODE;
}

// 从接口异常中提取用户可读文案，避免页面重复识别 ApiError 结构。
export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (isForbiddenError(error)) return '当前账号没有执行该后台操作的权限。';
  if (isDisabledAccountError(error)) return '账号已被禁用，请联系管理员处理。';
  return error instanceof ApiError ? error.message : fallback;
}
