// 标签控制器负责用户端标签查询和后台标签维护响应。
const tagService = require('../service/tag_service')
const { TAG_STATUS } = require('../constants/status')
const { success, pageSuccess } = require('../utils/response')

class TagController {
  // 用户端只查询启用标签，禁用标签不可用于新内容。
  async listEnabled(ctx) {
    const result = await tagService.listEnabled(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 后台分页查询全部标签，支持按状态筛选。
  async listAdmin(ctx) {
    const result = await tagService.listAdmin(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 后台新增标签，名称必须唯一。
  async create(ctx) {
    const result = await tagService.createTag(ctx.request.body || {})
    success(ctx, result, '创建标签成功')
  }

  // 后台修改标签名称。
  async update(ctx) {
    const result = await tagService.updateTag(Number(ctx.params.id), ctx.request.body || {})
    success(ctx, result, '更新标签成功')
  }

  // 后台启用标签，使其可被新内容选择。
  async enable(ctx) {
    const result = await tagService.updateStatus(Number(ctx.params.id), TAG_STATUS.ENABLED)
    success(ctx, result, '启用标签成功')
  }

  // 后台禁用标签，历史内容展示不受影响。
  async disable(ctx) {
    const result = await tagService.updateStatus(Number(ctx.params.id), TAG_STATUS.DISABLED)
    success(ctx, result, '禁用标签成功')
  }
}

module.exports = new TagController()
