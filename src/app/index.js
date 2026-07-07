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
const errorMiddleware = require('../middleware/error_middleware')
const fileLifecycleService = require('../service/file_lifecycle_service')
const { UPLOAD_PUBLIC_PATH } = require('../config/server')

const app = new Koa()

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
  ctx.body = fs.createReadStream(filePath)
})

// 注册用户端和后台业务路由。
const routers = [userRouter, tagRouter, fileRouter, contentRouter, commentRouter, adminRouter]
for (const router of routers) {
  app.use(router.routes())
  app.use(router.allowedMethods())
}

module.exports = app
