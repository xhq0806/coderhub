// 认证中间件负责解析 token、加载当前用户并执行账号状态与管理员权限校验。
const userService = require('../service/user_service')
const { USER_ROLE, USER_STATUS } = require('../constants/status')
const { verifyToken } = require('../utils/token')
const { createError } = require('../utils/response')

// 从 Authorization 请求头中提取 Bearer token，缺失时返回未认证错误。
function getBearerToken(ctx) {
  const authorization = ctx.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw createError('UNAUTHORIZED')
  }
  return token
}

// 校验登录身份并把当前用户挂载到 ctx.state.user，供 controller 和 service 使用。
async function verifyAuth(ctx, next) {
  const token = getBearerToken(ctx)
  const payload = verifyToken(token)
  const user = await userService.findById(payload.id)

  // token 对应的用户不存在或已删除时，按未认证处理。
  if (!user) {
    throw createError('UNAUTHORIZED')
  }

  // 禁用账号不能访问任何需要登录的用户端或后台写操作。
  if (user.status === USER_STATUS.DISABLED) {
    throw createError('USER_DISABLED')
  }

  ctx.state.user = user
  await next()
}

// 管理员校验建立在登录校验之后，普通用户访问后台统一返回无权限。
async function verifyAdmin(ctx, next) {
  await verifyAuth(ctx, async () => {
    if (ctx.state.user.role !== USER_ROLE.ADMIN) {
      throw createError('FORBIDDEN')
    }
    await next()
  })
}

module.exports = {
  verifyAuth,
  verifyAdmin
}
