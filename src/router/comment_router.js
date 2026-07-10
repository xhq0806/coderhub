// 评论路由声明回复评论和删除评论接口。
const KoaRouter = require('@koa/router')
const commentController = require('../controller/comment_controller')
const { verifyAuth } = require('../middleware/auth_middleware')

const commentRouter = new KoaRouter({ prefix: '/comments' })

// by AI.Coding：回复列表允许公开读取，但仅接受顶级评论 ID。
commentRouter.get('/:id/replies', commentController.listReplies)

// 回复评论必须登录，父评论必须存在且可见。
commentRouter.post('/:id/replies', verifyAuth, commentController.createReply)

// 删除评论必须登录，并由 service 校验作者或内容作者权限。
commentRouter.delete('/:id', verifyAuth, commentController.deleteByUser)

module.exports = commentRouter
