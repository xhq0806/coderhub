// by AI.Coding：评论服务实现顶级评论分页、回复分页、两层归一和权限软删除。
const connectionPool = require('../app/database')
const contentService = require('./content_service')
const notificationService = require('./notification_service')
const { COMMENT_STATUS, CONTENT_STATUS, NOTIFICATION_TYPE, NOTIFICATION_TARGET } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

// by AI.Coding：统一转换评论字段，并在顶级查询中附带回复数量。
function toCommentItem(row) {
  return {
    id: row.id,
    contentId: row.content_id || row.contentId,
    userId: row.user_id || row.userId,
    parentId: row.parent_id || row.parentId || null,
    body: row.body,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    ...(row.reply_count !== undefined ? { replyCount: Number(row.reply_count) } : {})
  }
}

// by AI.Coding：评论正文统一做类型、空白和数据库长度校验。
function normalizeBody(body, emptyMessage) {
  if (typeof body !== 'string') throw createError('PARAMS_ERROR', emptyMessage)
  const normalized = body.trim()
  if (!normalized) throw createError('PARAMS_ERROR', emptyMessage)
  if (normalized.length > 500) throw createError('PARAMS_ERROR', '评论内容不能超过 500 字')
  return normalized
}

class CommentService {
  // by AI.Coding：按 ID 查询评论，用于回复归根和删除权限校验。
  async findById(commentId) {
    const [comments] = await connectionPool.execute('SELECT * FROM `comment` WHERE `id` = ?;', [commentId])
    return comments[0] || null
  }

  // by AI.Coding：对公开内容创建顶级评论并通知内容作者。
  async createComment(userId, contentId, body) {
    const normalizedBody = normalizeBody(body, '评论内容不能为空')
    const content = await contentService.findById(contentId)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在或未公开')
    const [result] = await connectionPool.execute('INSERT INTO `comment` (`content_id`, `user_id`, `body`, `status`) VALUES (?, ?, ?, ?);', [contentId, userId, normalizedBody, COMMENT_STATUS.VISIBLE])
    const comment = toCommentItem(await this.findById(result.insertId))
    await notificationService.createNotification({ userId: content.user_id, actorUserId: userId, type: NOTIFICATION_TYPE.COMMENT, title: '你的动态有新评论', body: comment.body, targetType: NOTIFICATION_TARGET.COMMENT, targetId: comment.id })
    return comment
  }

  // by AI.Coding：回复任意可见评论时归一到其顶级根评论，保持数据库只有两层结构。
  async createReply(userId, targetCommentId, body) {
    const normalizedBody = normalizeBody(body, '回复内容不能为空')
    const target = await this.findById(targetCommentId)
    if (!target || target.status !== COMMENT_STATUS.VISIBLE) throw createError('NOT_FOUND', '评论不存在或已删除')
    const rootId = target.parent_id || target.id
    const root = target.parent_id ? await this.findById(rootId) : target
    if (!root || root.parent_id || root.status !== COMMENT_STATUS.VISIBLE || root.content_id !== target.content_id) throw createError('NOT_FOUND', '顶级评论不存在或已删除')
    const content = await contentService.findById(root.content_id)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在或未公开')
    const [result] = await connectionPool.execute('INSERT INTO `comment` (`content_id`, `user_id`, `parent_id`, `body`, `status`) VALUES (?, ?, ?, ?, ?);', [root.content_id, userId, rootId, normalizedBody, COMMENT_STATUS.VISIBLE])
    const reply = toCommentItem(await this.findById(result.insertId))
    const recipients = [...new Set([target.user_id, content.user_id])]
    for (const recipientId of recipients) {
      await notificationService.createNotification({ userId: recipientId, actorUserId: userId, type: NOTIFICATION_TYPE.REPLY, title: '你收到了新的回复', body: reply.body, targetType: NOTIFICATION_TARGET.COMMENT, targetId: reply.id })
    }
    return reply
  }

  // by AI.Coding：公开评论列表只分页顶级评论，并用一次聚合查询附带每楼回复数。
  async listByContent(contentId, query = {}) {
    await contentService.getPublishedDetail(contentId)
    const { page, pageSize, offset } = parsePage(query)
    const [list] = await connectionPool.execute(
      `SELECT root.*, COUNT(reply.id) AS reply_count
       FROM comment root
       LEFT JOIN comment reply ON reply.parent_id = root.id AND reply.status = ?
       WHERE root.content_id = ? AND root.status = ? AND root.parent_id IS NULL
       GROUP BY root.id
       ORDER BY root.created_at DESC, root.id DESC
       LIMIT ? OFFSET ?;`,
      [COMMENT_STATUS.VISIBLE, contentId, COMMENT_STATUS.VISIBLE, pageSize, offset]
    )
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM `comment` WHERE `content_id` = ? AND `status` = ? AND `parent_id` IS NULL;', [contentId, COMMENT_STATUS.VISIBLE])
    return { list: list.map(toCommentItem), total: countRows[0].total, page, pageSize }
  }

  // by AI.Coding：回复分页只接受可见顶级评论，按会话时间正序稳定展示。
  async listReplies(rootCommentId, query = {}) {
    const root = await this.findById(rootCommentId)
    if (!root || root.parent_id || root.status !== COMMENT_STATUS.VISIBLE) throw createError('NOT_FOUND', '顶级评论不存在或已删除')
    await contentService.getPublishedDetail(root.content_id)
    const { page, pageSize, offset } = parsePage(query)
    const [list] = await connectionPool.execute('SELECT * FROM `comment` WHERE `parent_id` = ? AND `status` = ? ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?;', [rootCommentId, COMMENT_STATUS.VISIBLE, pageSize, offset])
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM `comment` WHERE `parent_id` = ? AND `status` = ?;', [rootCommentId, COMMENT_STATUS.VISIBLE])
    return { list: list.map(toCommentItem), total: countRows[0].total, page, pageSize }
  }

  // by AI.Coding：删除顶级评论时事务性软删除整楼回复，删除回复时仅处理自身。
  async deleteByUser(userId, commentId) {
    const comment = await this.findById(commentId)
    if (!comment || comment.status === COMMENT_STATUS.DELETED) throw createError('NOT_FOUND', '评论不存在')
    const content = await contentService.findById(comment.content_id)
    if (comment.user_id !== userId && content.user_id !== userId) throw createError('FORBIDDEN')
    const connection = await connectionPool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('UPDATE `comment` SET `status` = ? WHERE `id` = ?;', [COMMENT_STATUS.DELETED, commentId])
      if (!comment.parent_id) await connection.execute('UPDATE `comment` SET `status` = ? WHERE `parent_id` = ? AND `status` = ?;', [COMMENT_STATUS.DELETED, commentId, COMMENT_STATUS.VISIBLE])
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    return { id: commentId }
  }

  // by AI.Coding：后台分页查询评论，支持按内容过滤。
  async listAdmin(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = []
    const conditions = []
    if (query.contentId) {
      conditions.push('content_id = ?')
      values.push(Number(query.contentId))
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [list] = await connectionPool.execute(`SELECT * FROM \`comment\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`comment\` ${where};`, values)
    return { list: list.map(toCommentItem), total: countRows[0].total, page, pageSize }
  }

  // by AI.Coding：管理员软删除任意违规评论；顶级评论同步删除整楼回复。
  async deleteByAdmin(commentId) {
    const comment = await this.findById(commentId)
    if (!comment) throw createError('NOT_FOUND', '评论不存在')
    await connectionPool.execute('UPDATE `comment` SET `status` = ? WHERE `id` = ? OR `parent_id` = ?;', [COMMENT_STATUS.DELETED, commentId, comment.parent_id ? -1 : commentId])
    return toCommentItem({ ...comment, status: COMMENT_STATUS.DELETED })
  }
}

module.exports = new CommentService()
