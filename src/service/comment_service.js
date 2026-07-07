// 评论服务封装评论、回复、分页查询和按权限删除业务。
const connectionPool = require('../app/database')
const contentService = require('./content_service')
const { COMMENT_STATUS, CONTENT_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

// 转换评论字段命名，统一接口返回结构。
function toCommentItem(row) {
  return {
    id: row.id,
    contentId: row.content_id || row.contentId,
    userId: row.user_id || row.userId,
    parentId: row.parent_id || row.parentId,
    body: row.body,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  }
}

class CommentService {
  // 按 ID 查询评论，用于回复和删除权限校验。
  async findById(commentId) {
    const [comments] = await connectionPool.execute('SELECT * FROM `comment` WHERE `id` = ?;', [commentId])
    return comments[0] || null
  }

  // 对公开内容发表评论，非公开内容不允许评论。
  async createComment(userId, contentId, body) {
    if (!body) throw createError('PARAMS_ERROR', '评论内容不能为空')
    const content = await contentService.findById(contentId)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在或未公开')
    const [result] = await connectionPool.execute('INSERT INTO `comment` (`content_id`, `user_id`, `body`, `status`) VALUES (?, ?, ?, ?);', [contentId, userId, body, COMMENT_STATUS.VISIBLE])
    return toCommentItem(await this.findById(result.insertId))
  }

  // 回复可见评论，父评论不存在或已删除时拒绝创建回复。
  async createReply(userId, parentCommentId, body) {
    if (!body) throw createError('PARAMS_ERROR', '回复内容不能为空')
    const parent = await this.findById(parentCommentId)
    if (!parent || parent.status !== COMMENT_STATUS.VISIBLE) throw createError('NOT_FOUND', '评论不存在或已删除')
    const content = await contentService.findById(parent.content_id)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在或未公开')
    const [result] = await connectionPool.execute('INSERT INTO `comment` (`content_id`, `user_id`, `parent_id`, `body`, `status`) VALUES (?, ?, ?, ?, ?);', [parent.content_id, userId, parentCommentId, body, COMMENT_STATUS.VISIBLE])
    return toCommentItem(await this.findById(result.insertId))
  }

  // 查询公开内容下可见评论分页列表。
  async listByContent(contentId, query = {}) {
    await contentService.getPublishedDetail(contentId)
    const { page, pageSize, offset } = parsePage(query)
    const [list] = await connectionPool.execute('SELECT * FROM `comment` WHERE `content_id` = ? AND `status` = ? ORDER BY created_at DESC LIMIT ? OFFSET ?;', [contentId, COMMENT_STATUS.VISIBLE, pageSize, offset])
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM `comment` WHERE `content_id` = ? AND `status` = ?;', [contentId, COMMENT_STATUS.VISIBLE])
    return { list: list.map(toCommentItem), total: countRows[0].total, page, pageSize }
  }

  // 评论作者或内容作者可以删除评论，其它普通用户无权限。
  async deleteByUser(userId, commentId) {
    const comment = await this.findById(commentId)
    if (!comment || comment.status === COMMENT_STATUS.DELETED) throw createError('NOT_FOUND', '评论不存在')
    const content = await contentService.findById(comment.content_id)
    if (comment.user_id !== userId && content.user_id !== userId) throw createError('FORBIDDEN')
    await connectionPool.execute('UPDATE `comment` SET `status` = ? WHERE `id` = ?;', [COMMENT_STATUS.DELETED, commentId])
    return { id: commentId }
  }

  // 后台分页查询评论，支持按内容过滤。
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

  // 管理员软删除任意违规评论。
  async deleteByAdmin(commentId) {
    const comment = await this.findById(commentId)
    if (!comment) throw createError('NOT_FOUND', '评论不存在')
    await connectionPool.execute('UPDATE `comment` SET `status` = ? WHERE `id` = ?;', [COMMENT_STATUS.DELETED, commentId])
    return toCommentItem({ ...comment, status: COMMENT_STATUS.DELETED })
  }
}

module.exports = new CommentService()
