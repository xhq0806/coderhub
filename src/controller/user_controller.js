// 用户控制器负责处理用户模块 HTTP 请求和统一响应输出。
const userService = require('../service/user_service')
const fileService = require('../service/file_service')
const { success, pageSuccess } = require('../utils/response')

class UserController {
  // 处理用户注册请求，成功后返回用户基础信息。
  async create(ctx) {
    const result = await userService.create(ctx.request.body || {})
    success(ctx, result, '创建用户成功')
  }

  // 处理用户登录请求，成功后返回 token 和用户资料。
  async login(ctx) {
    const result = await userService.login(ctx.request.body || {})
    success(ctx, result, '登录成功')
  }

  // 查询当前登录用户资料，当前用户由认证中间件注入。
  async me(ctx) {
    const profile = await userService.getProfile(ctx.state.user.id)
    success(ctx, profile, '查询成功')
  }

  // 修改当前用户资料，头像文件必须存在、用途为头像且归属当前用户。
  async updateMe(ctx) {
    const profile = ctx.request.body || {}
    if (profile.avatarFileId !== undefined) {
      await fileService.assertActiveAvatar(profile.avatarFileId, ctx.state.user.id)
    }

    const result = await userService.updateProfile(ctx.state.user.id, profile)
    success(ctx, result, '更新用户资料成功')
  }

  // 后台分页查询用户列表。
  async listAdmin(ctx) {
    const result = await userService.listUsers(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 后台禁用用户，禁用后用户不能登录和访问受保护接口。
  async disable(ctx) {
    const result = await userService.updateStatus(Number(ctx.params.id), 'disabled')
    success(ctx, result, '禁用用户成功')
  }

  // 后台恢复用户，恢复后用户可正常登录和访问接口。
  async enable(ctx) {
    const result = await userService.updateStatus(Number(ctx.params.id), 'active')
    success(ctx, result, '恢复用户成功')
  }
}

module.exports = new UserController()
