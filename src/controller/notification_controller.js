// by AI.Coding：通知控制器负责将通知服务结果转换为统一 HTTP 响应。
const notificationService = require('../service/notification_service')
const { success, pageSuccess } = require('../utils/response')

class NotificationController {
  // by AI.Coding：分页查询当前登录用户的站内通知。
  async listMine(ctx) {
    const result = await notificationService.listMine(ctx.state.user.id, ctx.query || {})
    pageSuccess(ctx, result)
  }

  // by AI.Coding：查询当前登录用户未读通知数量。
  async unreadCount(ctx) {
    const result = await notificationService.getUnreadCount(ctx.state.user.id)
    success(ctx, result, '查询成功')
  }

  // by AI.Coding：标记当前登录用户的一条通知为已读。
  async markRead(ctx) {
    const result = await notificationService.markRead(ctx.state.user.id, Number(ctx.params.id))
    success(ctx, result, '通知已读')
  }

  // by AI.Coding：批量标记当前登录用户全部未读通知为已读。
  async markAllRead(ctx) {
    const result = await notificationService.markAllRead(ctx.state.user.id)
    success(ctx, result, '全部通知已读')
  }
}

module.exports = new NotificationController()
