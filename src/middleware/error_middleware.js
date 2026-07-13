// 统一错误处理中间件把业务错误和未知异常转换为固定响应结构。
const ERROR_CODES = require('../constants/error_codes')

// 捕获下游中间件抛出的异常，避免接口返回不一致的错误格式。
async function errorMiddleware(ctx, next) {
  try {
    await next()
  } catch (error) {
    // by AI.Coding：浏览器取消静态/SSE 响应是正常连接生命周期，不应作为应用错误打印。
    if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE') return
    const fallback = ERROR_CODES.INTERNAL_ERROR
    const status = error.status || fallback.status

    // 未知异常只返回通用提示，避免向客户端暴露内部实现细节。
    ctx.status = status
    ctx.body = {
      code: error.code || fallback.code,
      message: error.message || fallback.message
    }

    // 服务端错误保留日志，方便本地开发排查数据库或代码异常。
    if (status >= 500) {
      console.error(error)
    }
  }
}

module.exports = errorMiddleware
