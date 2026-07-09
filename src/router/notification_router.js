// by AI.Coding：通知路由声明站内通知读取和已读操作，全部要求登录。
const KoaRouter = require('@koa/router')
const notificationController = require('../controller/notification_controller')
const { verifyAuth } = require('../middleware/auth_middleware')

const notificationRouter = new KoaRouter({ prefix: '/notifications' })

// by AI.Coding：通知属于个人数据，所有接口必须经过登录认证。
notificationRouter.use(verifyAuth)
notificationRouter.get('/', notificationController.listMine)
notificationRouter.get('/unread-count', notificationController.unreadCount)
notificationRouter.patch('/read-all', notificationController.markAllRead)
notificationRouter.patch('/:id/read', notificationController.markRead)

module.exports = notificationRouter
