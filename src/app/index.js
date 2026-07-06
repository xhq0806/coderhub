const Koa = require('koa')
// 导入路由
const userRouter = require('../router/user_router')

const app = new Koa()

app.use(userRouter.routes())//将所有的路由规则进行注册
app.use(userRouter.allowedMethods())//拦截不匹配请求方法，自动返回 405 状态码

// 向外导出app
module.exports = app