const Koa = require('koa')
const KoaRouter = require('@koa/router')

const app = new Koa()
// 创建路由实例
const userRouter = new KoaRouter({ prefix: '/users' })
// 创建路由规则
userRouter.get('/list', (ctx, next) => {
  ctx.body = `users list`
})

app.use(userRouter.routes())//将所有的路由规则进行注册
app.use(userRouter.allowedMethods())//拦截不匹配请求方法，自动返回 405 状态码

// 监听 8000 端口，启动成功后打印日志
app.listen(8000, () => {
  console.log('coderhub的服务器启动成功~')
})