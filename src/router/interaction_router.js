// by AI.Coding：互动路由声明内容点赞和收藏接口，所有写操作要求登录。
const KoaRouter = require('@koa/router')
const interactionController = require('../controller/interaction_controller')
const { verifyAuth } = require('../middleware/auth_middleware')

const interactionRouter = new KoaRouter({ prefix: '/contents' })

// by AI.Coding：点赞和收藏只针对公开内容，具体状态由 service 校验。
interactionRouter.post('/:id/likes', verifyAuth, interactionController.likeContent)
interactionRouter.delete('/:id/likes', verifyAuth, interactionController.unlikeContent)
interactionRouter.post('/:id/favorites', verifyAuth, interactionController.favoriteContent)
interactionRouter.delete('/:id/favorites', verifyAuth, interactionController.unfavoriteContent)

module.exports = interactionRouter
