// by AI.Coding：关注控制器负责用户公开主页和关注关系接口响应。
const followService = require('../service/follow_service')
const contentService = require('../service/content_service')
const { success, pageSuccess } = require('../utils/response')

class FollowController {
  // by AI.Coding：查询 active 用户公开主页，访客也可访问。
  async profile(ctx) {
    const result = await followService.getPublicProfile(Number(ctx.params.id), ctx.state.user?.id)
    success(ctx, result, '查询成功')
  }

  // by AI.Coding：查询用户主页下的公开动态列表。
  async contents(ctx) {
    await followService.assertActiveUser(Number(ctx.params.id))
    const result = await contentService.listPublishedByUser(Number(ctx.params.id), ctx.query || {}, ctx.state.user?.id)
    pageSuccess(ctx, result)
  }

  // by AI.Coding：当前用户关注目标用户。
  async follow(ctx) {
    const result = await followService.followUser(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '关注成功')
  }

  // by AI.Coding：当前用户取消关注目标用户。
  async unfollow(ctx) {
    const result = await followService.unfollowUser(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '取消关注成功')
  }
}

module.exports = new FollowController()
