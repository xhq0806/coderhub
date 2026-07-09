// by AI.Coding：关注路由声明用户主页、公开动态和关注关系接口。
const KoaRouter = require('@koa/router')
const followController = require('../controller/follow_controller')
const { verifyAuth, optionalAuth } = require('../middleware/auth_middleware')

const followRouter = new KoaRouter({ prefix: '/users' })

// by AI.Coding：公开主页允许访客访问，携带 token 时补充 viewer 关注状态。
followRouter.get('/:id/profile', optionalAuth, followController.profile)
followRouter.get('/:id/contents', optionalAuth, followController.contents)
followRouter.post('/:id/follow', verifyAuth, followController.follow)
followRouter.delete('/:id/follow', verifyAuth, followController.unfollow)

module.exports = followRouter
