// by AI.Coding：互动控制器负责点赞、收藏和我的收藏接口响应。
const interactionService = require('../service/interaction_service')
const { success, pageSuccess } = require('../utils/response')

class InteractionController {
  // by AI.Coding：将当前用户对内容置为已点赞。
  async likeContent(ctx) {
    const result = await interactionService.likeContent(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '点赞成功')
  }

  // by AI.Coding：将当前用户对内容置为未点赞。
  async unlikeContent(ctx) {
    const result = await interactionService.unlikeContent(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '取消点赞成功')
  }

  // by AI.Coding：将当前用户对内容置为已收藏。
  async favoriteContent(ctx) {
    const result = await interactionService.favoriteContent(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '收藏成功')
  }

  // by AI.Coding：将当前用户对内容置为未收藏。
  async unfavoriteContent(ctx) {
    const result = await interactionService.unfavoriteContent(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '取消收藏成功')
  }

  // by AI.Coding：分页查询当前用户收藏过且仍公开的内容。
  async listFavorites(ctx) {
    const result = await interactionService.listFavorites(ctx.state.user.id, ctx.query || {})
    pageSuccess(ctx, result)
  }
}

module.exports = new InteractionController()
