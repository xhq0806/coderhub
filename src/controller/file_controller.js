// 文件控制器负责头像图片、内容图片上传和后台文件管理响应。
const fileService = require('../service/file_service')
const fileLifecycleService = require('../service/file_lifecycle_service')
const { FILE_USAGE } = require('../constants/status')
const { success, pageSuccess } = require('../utils/response')

class FileController {
  // 上传头像图片，返回可用于用户头像的文件信息。
  async uploadAvatar(ctx) {
    const result = await fileService.createFile(ctx.state.user.id, FILE_USAGE.AVATAR, ctx.file)
    success(ctx, result, '上传头像成功')
  }

  // 上传内容图片，返回可用于发布动态的文件信息。
  async uploadContentImage(ctx) {
    const result = await fileService.createFile(ctx.state.user.id, FILE_USAGE.CONTENT_IMAGE, ctx.file)
    success(ctx, result, '上传内容图片成功')
  }

  // 后台分页查询上传文件。
  async listAdmin(ctx) {
    const result = await fileService.listAdmin(ctx.query || {})
    pageSuccess(ctx, result)
  }

  // 后台删除违规文件，删除后不再允许业务引用。
  async deleteAdmin(ctx) {
    const result = await fileLifecycleService.deleteByAdmin(Number(ctx.params.id))
    success(ctx, result, '删除文件成功')
  }
}

module.exports = new FileController()
