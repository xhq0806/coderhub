// by AI.Coding：互动服务集中维护点赞、收藏、收藏列表和内容互动状态。
const connectionPool = require('../app/database')
const contentService = require('./content_service')
const notificationService = require('./notification_service')
const { CONTENT_STATUS, NOTIFICATION_TYPE, NOTIFICATION_TARGET } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

class InteractionService {
  // by AI.Coding：校验互动目标必须是已公开内容，防止非公开内容被点赞或收藏。
  async assertPublishedContent(contentId) {
    const content = await contentService.findById(contentId)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在')
    return content
  }

  // by AI.Coding：返回单个内容的互动计数和当前用户状态，供按钮局部刷新。
  async getContentInteractionState(contentId, viewerId) {
    const [rows] = await connectionPool.execute(
      'SELECT (SELECT COUNT(*) FROM content_like WHERE content_id = ?) AS likeCount, (SELECT COUNT(*) FROM content_favorite WHERE content_id = ?) AS favoriteCount, (SELECT COUNT(*) FROM `comment` WHERE content_id = ? AND status = ?) AS commentCount, EXISTS (SELECT 1 FROM content_like WHERE content_id = ? AND user_id = ?) AS viewerLiked, EXISTS (SELECT 1 FROM content_favorite WHERE content_id = ? AND user_id = ?) AS viewerFavorited;',
      [contentId, contentId, contentId, 'visible', contentId, viewerId, contentId, viewerId]
    )
    const state = rows[0]
    return {
      contentId,
      likeCount: Number(state.likeCount || 0),
      favoriteCount: Number(state.favoriteCount || 0),
      commentCount: Number(state.commentCount || 0),
      viewerLiked: Boolean(state.viewerLiked),
      viewerFavorited: Boolean(state.viewerFavorited)
    }
  }

  // by AI.Coding：点赞公开内容，只有首次点赞生成作者通知。
  async likeContent(userId, contentId) {
    const content = await this.assertPublishedContent(contentId)
    const [result] = await connectionPool.execute('INSERT IGNORE INTO content_like (`content_id`, `user_id`) VALUES (?, ?);', [contentId, userId])
    // by AI.Coding：只在唯一索引实际插入成功时通知作者，并发重复点赞保持幂等。
    if (result.affectedRows > 0) {
      await notificationService.createNotification({ userId: content.user_id, actorUserId: userId, type: NOTIFICATION_TYPE.LIKE, title: '你的动态收到了点赞', body: '有人点赞了你的公开动态。', targetType: NOTIFICATION_TARGET.CONTENT, targetId: contentId })
    }
    return this.getContentInteractionState(contentId, userId)
  }

  // by AI.Coding：取消点赞保持幂等，不存在点赞关系时也返回最终未点赞状态。
  async unlikeContent(userId, contentId) {
    await this.assertPublishedContent(contentId)
    await connectionPool.execute('DELETE FROM content_like WHERE content_id = ? AND user_id = ?;', [contentId, userId])
    return this.getContentInteractionState(contentId, userId)
  }

  // by AI.Coding：收藏公开内容，只有首次收藏生成作者通知。
  async favoriteContent(userId, contentId) {
    const content = await this.assertPublishedContent(contentId)
    const [result] = await connectionPool.execute('INSERT IGNORE INTO content_favorite (`content_id`, `user_id`) VALUES (?, ?);', [contentId, userId])
    // by AI.Coding：并发重复收藏由唯一索引吸收，仅首次收藏产生通知。
    if (result.affectedRows > 0) {
      await notificationService.createNotification({ userId: content.user_id, actorUserId: userId, type: NOTIFICATION_TYPE.FAVORITE, title: '你的动态被收藏了', body: '有人收藏了你的公开动态。', targetType: NOTIFICATION_TARGET.CONTENT, targetId: contentId })
    }
    return this.getContentInteractionState(contentId, userId)
  }

  // by AI.Coding：取消收藏保持幂等，不生成通知。
  async unfavoriteContent(userId, contentId) {
    await this.assertPublishedContent(contentId)
    await connectionPool.execute('DELETE FROM content_favorite WHERE content_id = ? AND user_id = ?;', [contentId, userId])
    return this.getContentInteractionState(contentId, userId)
  }

  // by AI.Coding：查询我的收藏列表，只返回仍然公开的内容。
  async listFavorites(userId, query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const { select, joins } = contentService.buildPublicSelect(userId)
    const [list] = await connectionPool.execute(`SELECT ${select} FROM \`content\` c INNER JOIN content_favorite fav ON fav.content_id = c.id ${joins} WHERE fav.user_id = ? AND c.status = ? ORDER BY fav.created_at DESC LIMIT ? OFFSET ?;`, [userId, userId, userId, CONTENT_STATUS.PUBLISHED, pageSize, offset])
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM content_favorite fav INNER JOIN `content` c ON c.id = fav.content_id WHERE fav.user_id = ? AND c.status = ?;', [userId, CONTENT_STATUS.PUBLISHED])
    return { list: list.map((row) => contentService.toContentItem(row)), total: countRows[0].total, page, pageSize }
  }
}

module.exports = new InteractionService()
