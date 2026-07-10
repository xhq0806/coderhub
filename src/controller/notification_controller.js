// by AI.Coding：通知控制器负责将通知服务结果转换为统一 HTTP 响应。
const notificationService = require('../service/notification_service')
const notificationBroker = require('../service/notification_broker')
const { PassThrough } = require('stream')
const { success, pageSuccess } = require('../utils/response')

class NotificationController {
  // by AI.Coding：建立鉴权 SSE 长连接，实时事件仅作为 REST 缓存失效信号。
  async stream(ctx) {
    const stream = new PassThrough()
    const userId = ctx.state.user.id
    ctx.req.setTimeout(0)
    ctx.status = 200
    ctx.set('Content-Type', 'text/event-stream; charset=utf-8')
    ctx.set('Cache-Control', 'no-cache, no-transform')
    ctx.set('Connection', 'keep-alive')
    ctx.set('X-Accel-Buffering', 'no')
    ctx.body = stream

    // by AI.Coding：连接成功事件用于前端重置退避计数。
    stream.write('event: connected\ndata: {"connected":true}\n\n')
    const unsubscribe = notificationBroker.subscribe(userId, (event) => {
      stream.write(`id: ${event.notificationId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    })
    const heartbeat = setInterval(() => stream.write(': heartbeat\n\n'), 25_000)
    let closed = false
    const cleanup = () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      unsubscribe()
      stream.end()
    }
    ctx.res.once('close', cleanup)
    ctx.res.once('error', cleanup)
  }

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
