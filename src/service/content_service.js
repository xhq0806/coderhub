// 内容服务封装动态发布、审核、查询、编辑和删除业务。
const connectionPool = require('../app/database')
const contentPublicationService = require('./content_publication_service')
const notificationService = require('./notification_service')
const { CONTENT_STATUS, NOTIFICATION_TYPE, NOTIFICATION_TARGET, TAG_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

// by AI.Coding：转义 LIKE 搜索中的通配符，避免用户输入 % 或 _ 扩大匹配范围。
function escapeLikeKeyword(keyword) {
  return String(keyword).replace(/[%_]/g, '')
}

// by AI.Coding：将可选登录用户 ID 规范为数字或 null，便于 SQL 聚合 viewer 状态。
function normalizeViewerId(viewerId) {
  const id = Number(viewerId)
  return Number.isInteger(id) && id > 0 ? id : null
}

// by AI.Coding：将内容数据库记录转换为接口字段命名，并补充互动聚合字段默认值。
function toContentItem(row) {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    body: row.body,
    status: row.status,
    rejectReason: row.reject_reason || row.rejectReason,
    reviewerId: row.reviewer_id || row.reviewerId,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    likeCount: Number(row.likeCount || 0),
    favoriteCount: Number(row.favoriteCount || 0),
    commentCount: Number(row.commentCount || 0),
    viewerLiked: Boolean(row.viewerLiked),
    viewerFavorited: Boolean(row.viewerFavorited)
  }
}

class ContentService {
  // by AI.Coding：开放内容行转换能力，供互动和收藏列表复用统一响应字段。
  toContentItem(row) {
    return toContentItem(row)
  }

  // by AI.Coding：构造公开内容聚合查询字段，统一为列表、详情和主页内容补充互动计数。
  buildPublicSelect(viewerId) {
    const viewer = normalizeViewerId(viewerId)
    return {
      viewer,
      select: `c.*, COALESCE(lc.likeCount, 0) AS likeCount, COALESCE(fc.favoriteCount, 0) AS favoriteCount, COALESCE(cc.commentCount, 0) AS commentCount, ${viewer ? 'EXISTS (SELECT 1 FROM content_like vl WHERE vl.content_id = c.id AND vl.user_id = ?) AS viewerLiked, EXISTS (SELECT 1 FROM content_favorite vf WHERE vf.content_id = c.id AND vf.user_id = ?) AS viewerFavorited' : '0 AS viewerLiked, 0 AS viewerFavorited'}`,
      joins: 'LEFT JOIN (SELECT content_id, COUNT(*) AS likeCount FROM content_like GROUP BY content_id) lc ON lc.content_id = c.id LEFT JOIN (SELECT content_id, COUNT(*) AS favoriteCount FROM content_favorite GROUP BY content_id) fc ON fc.content_id = c.id LEFT JOIN (SELECT content_id, COUNT(*) AS commentCount FROM `comment` WHERE status = \'visible\' GROUP BY content_id) cc ON cc.content_id = c.id'
    }
  }

  // 查询内容基础记录，供权限校验和状态流转使用。
  async findById(contentId) {
    const [contents] = await connectionPool.execute('SELECT * FROM `content` WHERE `id` = ?;', [contentId])
    return contents[0] || null
  }

  // by AI.Coding：读取内容详情并补充标签、图片和互动聚合信息。
  async buildDetail(content, viewerId) {
    const { viewer, select, joins } = this.buildPublicSelect(viewerId)
    const values = viewer ? [viewer, viewer, content.id] : [content.id]
    const [rows] = await connectionPool.execute(`SELECT ${select} FROM \`content\` c ${joins} WHERE c.id = ?;`, values)
    const base = rows[0] || content
    const [tags] = await connectionPool.execute(
      'SELECT t.id, t.name, t.status FROM `tag` t INNER JOIN `content_tag` ct ON ct.tag_id = t.id WHERE ct.content_id = ?;',
      [content.id]
    )
    const [files] = await connectionPool.execute(
      'SELECT f.id, f.url, f.usage_type AS usageType, f.status FROM `file` f INNER JOIN `content_file` cf ON cf.file_id = f.id WHERE cf.content_id = ? AND f.status = ?;',
      [content.id, 'active']
    )
    return { ...toContentItem(base), tags, files }
  }

  // 创建待审核内容，正文和图片不能同时为空，标签和文件必须有效。
  async createContent(userId, payload = {}) {
    const draft = await contentPublicationService.prepareDraft(userId, payload)

    const connection = await connectionPool.getConnection()
    try {
      await connection.beginTransaction()
      const [result] = await connection.execute('INSERT INTO `content` (`user_id`, `body`, `status`) VALUES (?, ?, ?);', [userId, draft.body, CONTENT_STATUS.PENDING])
      const contentId = result.insertId

      // 内容资源关联由发布模块统一维护，避免创建和编辑路径规则分叉。
      await contentPublicationService.replaceAssociations(connection, contentId, draft)

      await connection.commit()
      return this.buildDetail(await this.findById(contentId))
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // by AI.Coding：查询公开内容分页列表，支持关键词、标签、排序和当前用户互动状态。
  async listPublished(query = {}, viewerId) {
    const { page, pageSize, offset } = parsePage(query)
    const { viewer, select, joins } = this.buildPublicSelect(viewerId)
    const values = viewer ? [viewer, viewer, CONTENT_STATUS.PUBLISHED] : [CONTENT_STATUS.PUBLISHED]
    const conditions = ['c.status = ?']
    if (query.keyword) {
      const keyword = String(query.keyword).trim()
      if (keyword.length > 50) throw createError('PARAMS_ERROR', '关键词不能超过 50 字')
      if (keyword) {
        conditions.push('c.body LIKE ?')
        values.push(`%${escapeLikeKeyword(keyword)}%`)
      }
    }
    if (query.tagId) {
      const tagId = Number(query.tagId)
      if (!Number.isInteger(tagId) || tagId <= 0) throw createError('PARAMS_ERROR', '标签参数错误')
      // by AI.Coding：公开筛选只接受启用标签，禁用或不存在的标签按参数错误处理。
      const [tags] = await connectionPool.execute('SELECT id FROM `tag` WHERE `id` = ? AND `status` = ?;', [tagId, TAG_STATUS.ENABLED])
      if (!tags.length) throw createError('PARAMS_ERROR', '标签不存在或已禁用')
      conditions.push('EXISTS (SELECT 1 FROM content_tag ct WHERE ct.content_id = c.id AND ct.tag_id = ?)')
      values.push(tagId)
    }
    const sort = query.sort || 'latest'
    if (!['latest', 'hot'].includes(sort)) throw createError('PARAMS_ERROR', '排序参数错误')
    const where = `WHERE ${conditions.join(' AND ')}`
    const orderBy = sort === 'hot' ? 'ORDER BY (COALESCE(lc.likeCount, 0) + COALESCE(fc.favoriteCount, 0) + COALESCE(cc.commentCount, 0)) DESC, c.created_at DESC' : 'ORDER BY c.created_at DESC'
    const [list] = await connectionPool.execute(`SELECT ${select} FROM \`content\` c ${joins} ${where} ${orderBy} LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const countValues = values.slice(viewer ? 2 : 0)
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`content\` c ${where};`, countValues)
    return { list: list.map(toContentItem), total: countRows[0].total, page, pageSize }
  }

  // by AI.Coding：查询公开内容详情，非公开内容对公众表现为不存在。
  async getPublishedDetail(contentId, viewerId) {
    const content = await this.findById(contentId)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在')
    return this.buildDetail(content, viewerId)
  }

  // by AI.Coding：查询指定 active 用户的公开动态，用于用户主页内容流。
  async listPublishedByUser(userId, query = {}, viewerId) {
    const { page, pageSize, offset } = parsePage(query)
    const { viewer, select, joins } = this.buildPublicSelect(viewerId)
    const values = viewer ? [viewer, viewer, CONTENT_STATUS.PUBLISHED, userId] : [CONTENT_STATUS.PUBLISHED, userId]
    const where = 'WHERE c.status = ? AND c.user_id = ?'
    const [list] = await connectionPool.execute(`SELECT ${select} FROM \`content\` c ${joins} ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM `content` c WHERE c.status = ? AND c.user_id = ?;', [CONTENT_STATUS.PUBLISHED, userId])
    return { list: list.map(toContentItem), total: countRows[0].total, page, pageSize }
  }

  // 作者查询自己的内容，默认只展示待审核、已驳回和已公开内容。
  async listMine(userId, query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = [userId]
    const visibleStatuses = [CONTENT_STATUS.PENDING, CONTENT_STATUS.REJECTED, CONTENT_STATUS.PUBLISHED]
    const conditions = ['user_id = ?']
    if (query.status) {
      if (!visibleStatuses.includes(query.status)) throw createError('NOT_FOUND', '内容不存在')
      conditions.push('status = ?')
      values.push(query.status)
    } else {
      conditions.push(`status IN (${visibleStatuses.map(() => '?').join(',')})`)
      values.push(...visibleStatuses)
    }
    const where = `WHERE ${conditions.join(' AND ')}`
    const [list] = await connectionPool.execute(`SELECT * FROM \`content\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`content\` ${where};`, values)
    return { list: list.map(toContentItem), total: countRows[0].total, page, pageSize }
  }

  // 作者只能编辑自己的待审核或已驳回内容，编辑后仍保持待审核状态。
  async updateMine(userId, contentId, payload = {}) {
    const content = await this.findById(contentId)
    if (!content || content.status === CONTENT_STATUS.DELETED) throw createError('NOT_FOUND', '内容不存在')
    if (content.user_id !== userId) throw createError('FORBIDDEN')
    if (![CONTENT_STATUS.PENDING, CONTENT_STATUS.REJECTED].includes(content.status)) throw createError('INVALID_STATUS')

    const draft = await contentPublicationService.prepareDraft(userId, payload)

    const connection = await connectionPool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('UPDATE `content` SET `body` = ?, `status` = ?, `reject_reason` = NULL, `reviewer_id` = NULL, `reviewed_at` = NULL WHERE `id` = ?;', [draft.body, CONTENT_STATUS.PENDING, contentId])
      await contentPublicationService.replaceAssociations(connection, contentId, draft)
      await connection.commit()
      return this.buildDetail(await this.findById(contentId))
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // 作者软删除自己的内容，删除后不再公开展示。
  async deleteMine(userId, contentId) {
    const content = await this.findById(contentId)
    if (!content || content.status === CONTENT_STATUS.DELETED) throw createError('NOT_FOUND', '内容不存在')
    if (content.user_id !== userId) throw createError('FORBIDDEN')
    await connectionPool.execute('UPDATE `content` SET `status` = ? WHERE `id` = ?;', [CONTENT_STATUS.DELETED, contentId])
    return { id: contentId }
  }

  // 后台分页查询全部状态内容，支持按状态过滤。
  async listAdmin(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = []
    const conditions = []
    if (query.status) {
      conditions.push('status = ?')
      values.push(query.status)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [list] = await connectionPool.execute(`SELECT * FROM \`content\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`content\` ${where};`, values)
    return { list: list.map(toContentItem), total: countRows[0].total, page, pageSize }
  }

  // 管理员审核通过待审核内容，公开后可被列表和详情查询。
  async approve(contentId, reviewerId) {
    const content = await this.findById(contentId)
    if (!content) throw createError('NOT_FOUND', '内容不存在')
    if (content.status !== CONTENT_STATUS.PENDING) throw createError('INVALID_STATUS')
    await connectionPool.execute('UPDATE `content` SET `status` = ?, `reviewer_id` = ?, `reviewed_at` = NOW(), `reject_reason` = NULL WHERE `id` = ?;', [CONTENT_STATUS.PUBLISHED, reviewerId, contentId])
    await notificationService.createNotification({ userId: content.user_id, actorUserId: reviewerId, type: NOTIFICATION_TYPE.CONTENT_APPROVED, title: '你的动态已审核通过', body: '你的动态已经公开，其他用户可以查看和互动。', targetType: NOTIFICATION_TARGET.CONTENT, targetId: contentId })
    return toContentItem(await this.findById(contentId))
  }

  // 管理员驳回待审核内容，并保存可供作者查看的驳回原因。
  async reject(contentId, reviewerId, reason) {
    if (!reason) throw createError('PARAMS_ERROR', '驳回原因不能为空')
    const content = await this.findById(contentId)
    if (!content) throw createError('NOT_FOUND', '内容不存在')
    if (content.status !== CONTENT_STATUS.PENDING) throw createError('INVALID_STATUS')
    await connectionPool.execute('UPDATE `content` SET `status` = ?, `reviewer_id` = ?, `reviewed_at` = NOW(), `reject_reason` = ? WHERE `id` = ?;', [CONTENT_STATUS.REJECTED, reviewerId, reason, contentId])
    await notificationService.createNotification({ userId: content.user_id, actorUserId: reviewerId, type: NOTIFICATION_TYPE.CONTENT_REJECTED, title: '你的动态已被驳回', body: `驳回原因：${reason}`, targetType: NOTIFICATION_TARGET.CONTENT, targetId: contentId })
    return toContentItem(await this.findById(contentId))
  }

  // 管理员下架内容，下架后不在公开列表展示。
  async offline(contentId) {
    return this.updateAdminStatus(contentId, CONTENT_STATUS.OFFLINE)
  }

  // 管理员软删除内容，删除后对公众不可见。
  async deleteByAdmin(contentId) {
    return this.updateAdminStatus(contentId, CONTENT_STATUS.DELETED)
  }

  // 后台通用状态更新方法，用于下架和删除内容。
  async updateAdminStatus(contentId, status) {
    const content = await this.findById(contentId)
    if (!content) throw createError('NOT_FOUND', '内容不存在')
    await connectionPool.execute('UPDATE `content` SET `status` = ? WHERE `id` = ?;', [status, contentId])
    return toContentItem(await this.findById(contentId))
  }
}

module.exports = new ContentService()
