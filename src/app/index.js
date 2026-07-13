// 应用入口模块负责组装 Koa 实例、中间件、静态资源和业务路由。
const fs = require('fs')
const path = require('path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const userRouter = require('../router/user_router')
const tagRouter = require('../router/tag_router')
const fileRouter = require('../router/file_router')
const contentRouter = require('../router/content_router')
const commentRouter = require('../router/comment_router')
const adminRouter = require('../router/admin_router')
const interactionRouter = require('../router/interaction_router')
const followRouter = require('../router/follow_router')
const notificationRouter = require('../router/notification_router')
const errorMiddleware = require('../middleware/error_middleware')
const fileLifecycleService = require('../service/file_lifecycle_service')
const { UPLOAD_PUBLIC_PATH } = require('../config/server')

const app = new Koa()

// by AI.Coding：客户端在页面切换或测试结束时提前关闭流属于正常情况，其它应用错误仍记录供排查。
app.on('error', (error) => {
  if (error?.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(error)
})

// 统一错误中间件必须最先注册，才能捕获后续路由抛出的业务错误。
app.use(errorMiddleware)

// 注册请求体解析中间件，保证 controller 可以读取 JSON 请求体。
app.use(bodyParser())

// 暴露本地上传目录，按 /uploads 前缀读取头像和内容图片。
app.use(async (ctx, next) => {
  if (!ctx.path.startsWith(UPLOAD_PUBLIC_PATH)) {
    await next()
    return
  }

  // 文件生命周期模块统一完成数据库状态和磁盘路径校验。
  const filePath = await fileLifecycleService.resolveServableDiskPath(ctx.path)
  if (!filePath) {
    ctx.status = 404
    return
  }

  ctx.type = path.extname(filePath)
  // by AI.Coding：客户端提前断开静态文件流不应升级为未处理的 premature close 错误。
  const fileStream = fs.createReadStream(filePath)
  fileStream.on('error', (error) => ctx.app.emit('error', error, ctx))
  ctx.body = fileStream
})

// 注册用户端和后台业务路由。
const routers = [userRouter, tagRouter, fileRouter, contentRouter, commentRouter, interactionRouter, followRouter, notificationRouter, adminRouter]
for (const router of routers) {
  app.use(router.routes())
  app.use(router.allowedMethods())
}

module.exports = app
