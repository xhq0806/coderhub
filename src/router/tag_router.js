// 标签路由声明用户端启用标签查询接口。
const KoaRouter = require('@koa/router')
const tagController = require('../controller/tag_controller')

const tagRouter = new KoaRouter({ prefix: '/tags' })

// 公开查询启用标签，供发布内容前选择。
tagRouter.get('/', tagController.listEnabled)

module.exports = tagRouter
