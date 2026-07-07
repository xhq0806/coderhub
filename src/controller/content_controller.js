// 内容控制器负责用户端内容接口和后台内容治理响应。
const contentService = require('../service/content_service')
const { success, pageSuccess } = require('../utils/response')

class ContentController {
  // 发布内容后进入待审核状态，未审核内容不公开展示。
  async create(ctx) {
    const result = await contentService.createContent(ctx.state.user.id, ctx.request.body || {})
    success(ctx, result, '发布内容成功，等待审核')
  }

  // 查询公开内容分页列表，只返回已公开内容。
  async listPublished(ctx) {
    const result = await contentService.listPublished(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 查询公开内容详情，非公开内容按不存在处理。
  async detail(ctx) {
    const result = await contentService.getPublishedDetail(Number(ctx.params.id))
    success(ctx, result, '查询成功')
  }

  // 查询当前用户自己的内容列表，允许查看审核状态。
  async listMine(ctx) {
    const result = await contentService.listMine(ctx.state.user.id, ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 作者编辑自己的待审核或已驳回内容。
  async updateMine(ctx) {
    const result = await contentService.updateMine(ctx.state.user.id, Number(ctx.params.id), ctx.request.body || {})
    success(ctx, result, '更新内容成功')
  }

  // 作者删除自己的内容，删除后不公开展示。
  async deleteMine(ctx) {
    const result = await contentService.deleteMine(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '删除内容成功')
  }

  // 后台查询全部状态内容。
  async listAdmin(ctx) {
    const result = await contentService.listAdmin(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 后台审核通过待审核内容。
  async approve(ctx) {
    const result = await contentService.approve(Number(ctx.params.id), ctx.state.user.id)
    success(ctx, result, '审核通过成功')
  }

  // 后台驳回待审核内容并保存驳回原因。
  async reject(ctx) {
    const result = await contentService.reject(Number(ctx.params.id), ctx.state.user.id, (ctx.request.body || {}).reason)
    success(ctx, result, '驳回内容成功')
  }

  // 后台下架已公开或违规内容。
  async offline(ctx) {
    const result = await contentService.offline(Number(ctx.params.id))
    success(ctx, result, '下架内容成功')
  }

  // 后台删除内容，删除后不公开展示。
  async deleteAdmin(ctx) {
    const result = await contentService.deleteByAdmin(Number(ctx.params.id))
    success(ctx, result, '删除内容成功')
  }
}

module.exports = new ContentController()
