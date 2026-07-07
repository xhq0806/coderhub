// 统一维护业务错误码，controller 和 service 通过这些常量保持响应一致。
const ERROR_CODES = {
  PARAMS_ERROR: { code: -1001, message: '参数错误', status: 400 },
  CONFLICT: { code: -1002, message: '资源已存在', status: 409 },
  AUTH_FAILED: { code: -1003, message: '用户名或密码错误', status: 401 },
  UNAUTHORIZED: { code: -1004, message: '未认证或登录已过期', status: 401 },
  USER_DISABLED: { code: -1005, message: '账号已被禁用', status: 403 },
  FORBIDDEN: { code: -1006, message: '无权限操作', status: 403 },
  NOT_FOUND: { code: -1007, message: '资源不存在', status: 404 },
  INVALID_STATUS: { code: -1008, message: '当前状态不允许该操作', status: 409 },
  INVALID_FILE_TYPE: { code: -1009, message: '文件类型错误', status: 400 },
  FILE_TOO_LARGE: { code: -1010, message: '文件大小超出限制', status: 413 },
  INTERNAL_ERROR: { code: -1500, message: '服务端错误', status: 500 }
}

// 导出错误码映射，便于统一错误中间件按 key 转换响应。
module.exports = ERROR_CODES
