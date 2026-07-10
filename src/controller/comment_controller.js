// 评论控制器负责评论、回复和删除接口响应。
const commentService = require('../service/comment_service')
const { success, pageSuccess } = require('../utils/response')

class CommentController {
  // 对公开内容发表评论。
  async createComment(ctx) {
    const result = await commentService.createComment(ctx.state.user.id, Number(ctx.params.id), (ctx.request.body || {}).body)
    success(ctx, result, '发表评论成功')
  }

  // 回复已有可见评论。
  async createReply(ctx) {
    const result = await commentService.createReply(ctx.state.user.id, Number(ctx.params.id), (ctx.request.body || {}).body)
    success(ctx, result, '回复评论成功')
  }

  // 查询公开内容下的可见评论。
  async listByContent(ctx) {
    const result = await commentService.listByContent(Number(ctx.params.id), ctx.query || {})
    pageSuccess(ctx, result)
  }

  // by AI.Coding：分页查询指定顶级评论下的可见回复。
  async listReplies(ctx) {
    const result = await commentService.listReplies(Number(ctx.params.id), ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 评论作者或内容作者删除评论。
  async deleteByUser(ctx) {
    const result = await commentService.deleteByUser(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '删除评论成功')
  }

  // 后台分页查询评论。
  async listAdmin(ctx) {
    const result = await commentService.listAdmin(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 管理员删除违规评论。
  async deleteAdmin(ctx) {
    const result = await commentService.deleteByAdmin(Number(ctx.params.id))
    success(ctx, result, '删除评论成功')
  }
}

module.exports = new CommentController()
