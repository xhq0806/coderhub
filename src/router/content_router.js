// 内容路由声明动态发布、公开查询、作者编辑和作者删除接口。
const KoaRouter = require('@koa/router')
const contentController = require('../controller/content_controller')
const commentController = require('../controller/comment_controller')
const { verifyAuth } = require('../middleware/auth_middleware')

const contentRouter = new KoaRouter({ prefix: '/contents' })

// 发布内容必须登录，发布后等待后台审核。
contentRouter.post('/', verifyAuth, contentController.create)

// 公开内容列表和详情允许访客访问。
contentRouter.get('/', contentController.listPublished)
contentRouter.get('/:id', contentController.detail)

// 作者只能编辑或删除自己的内容。
contentRouter.patch('/:id', verifyAuth, contentController.updateMine)
contentRouter.delete('/:id', verifyAuth, contentController.deleteMine)

// 评论公开内容必须登录，评论列表允许公开查看。
contentRouter.post('/:id/comments', verifyAuth, commentController.createComment)
contentRouter.get('/:id/comments', commentController.listByContent)

module.exports = contentRouter
