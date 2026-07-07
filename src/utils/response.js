// 响应工具统一封装成功响应、分页响应和业务错误创建逻辑。
const ERROR_CODES = require('../constants/error_codes')

// 创建业务错误对象，交给统一错误中间件转换为 HTTP 响应。
function createError(errorKey, message, extra = {}) {
  const baseError = ERROR_CODES[errorKey] || ERROR_CODES.INTERNAL_ERROR
  const error = new Error(message || baseError.message)
  error.code = baseError.code
  error.status = baseError.status
  error.errorKey = errorKey
  Object.assign(error, extra)
  return error
}

// 输出非分页成功响应，保持 code/message/data 结构一致。
function success(ctx, data = null, message = '操作成功') {
  ctx.body = {
    code: 0,
    message,
    data
  }
}

// 输出分页成功响应，列表接口统一携带 list、total、page、pageSize。
function pageSuccess(ctx, pageResult, message = '查询成功') {
  const { list, total, page, pageSize } = pageResult
  ctx.body = {
    code: 0,
    message,
    data: {
      list,
      total,
      page,
      pageSize
    }
  }
}

// 解析分页参数并限制边界，防止无效分页参数传入 SQL。
function parsePage(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100)
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}

module.exports = {
  createError,
  success,
  pageSuccess,
  parsePage
}
