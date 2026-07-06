const KoaRouter = require('@koa/router')

// 创建路由实例
const userRouter = new KoaRouter({ prefix: '/users' })
// 创建路由规则
userRouter.get('/list', (ctx, next) => {
  ctx.body = `users list`
})

// 向外导出路由
module.exports = userRouter