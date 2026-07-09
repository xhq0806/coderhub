// by AI.Coding：通知服务集中维护站内事件创建、分页读取和已读状态，避免事件散落到各业务模块。
const connectionPool = require('../app/database')
const { NOTIFICATION_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

// by AI.Coding：统一转换通知字段命名，保持前端接收 camelCase 结构。
function toNotificationItem(row) {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    actorUserId: row.actor_user_id || row.actorUserId || null,
    type: row.type,
    title: row.title,
    body: row.body,
    targetType: row.target_type || row.targetType,
    targetId: row.target_id || row.targetId,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
    readAt: row.read_at || row.readAt
  }
}

class NotificationService {
  // by AI.Coding：创建通知时跳过自己触发自己的事件，减少无意义通知数据。
  async createNotification(payload = {}) {
    const { userId, actorUserId = null, type, title, body = null, targetType, targetId } = payload
    if (!userId || !type || !title || !targetType || !targetId) return null
    if (actorUserId && Number(actorUserId) === Number(userId)) return null

    const [result] = await connectionPool.execute(
      'INSERT INTO `notification` (`user_id`, `actor_user_id`, `type`, `title`, `body`, `target_type`, `target_id`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      [userId, actorUserId, type, title, body, targetType, targetId, NOTIFICATION_STATUS.UNREAD]
    )
    return this.findMine(userId, result.insertId)
  }

  // by AI.Coding：按通知 ID 查询本人通知，供已读操作做权限校验。
  async findMine(userId, notificationId) {
    const [rows] = await connectionPool.execute('SELECT * FROM `notification` WHERE `id` = ? AND `user_id` = ?;', [notificationId, userId])
    return rows[0] ? toNotificationItem(rows[0]) : null
  }

  // by AI.Coding：分页读取当前用户通知，可按 unread/read 状态筛选。
  async listMine(userId, query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = [userId]
    const conditions = ['user_id = ?']
    if (query.status) {
      conditions.push('status = ?')
      values.push(query.status)
    }
    const where = `WHERE ${conditions.join(' AND ')}`
    const [list] = await connectionPool.execute(`SELECT * FROM notification ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM notification ${where};`, values)
    return { list: list.map(toNotificationItem), total: countRows[0].total, page, pageSize }
  }

  // by AI.Coding：统计未读通知数，供顶部导航角标展示。
  async getUnreadCount(userId) {
    const [rows] = await connectionPool.execute('SELECT COUNT(*) AS unreadCount FROM `notification` WHERE `user_id` = ? AND `status` = ?;', [userId, NOTIFICATION_STATUS.UNREAD])
    return { unreadCount: rows[0].unreadCount }
  }

  // by AI.Coding：单条通知已读只能操作本人通知，避免越权标记。
  async markRead(userId, notificationId) {
    const item = await this.findMine(userId, notificationId)
    if (!item) throw createError('NOT_FOUND', '通知不存在')
    await connectionPool.execute('UPDATE `notification` SET `status` = ?, `read_at` = NOW() WHERE `id` = ? AND `user_id` = ?;', [NOTIFICATION_STATUS.READ, notificationId, userId])
    return this.findMine(userId, notificationId)
  }

  // by AI.Coding：全部已读只更新当前用户未读通知，并返回更新数量。
  async markAllRead(userId) {
    const [result] = await connectionPool.execute('UPDATE `notification` SET `status` = ?, `read_at` = NOW() WHERE `user_id` = ? AND `status` = ?;', [NOTIFICATION_STATUS.READ, userId, NOTIFICATION_STATUS.UNREAD])
    return { updated: result.affectedRows }
  }
}

module.exports = new NotificationService()
