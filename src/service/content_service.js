// 内容服务封装动态发布、审核、查询、编辑和删除业务。
const connectionPool = require('../app/database')
const contentPublicationService = require('./content_publication_service')
const { CONTENT_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

// 将内容数据库记录转换为接口字段命名，统一前端可读格式。
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
    updatedAt: row.updated_at || row.updatedAt
  }
}

class ContentService {
  // 查询内容基础记录，供权限校验和状态流转使用。
  async findById(contentId) {
    const [contents] = await connectionPool.execute('SELECT * FROM `content` WHERE `id` = ?;', [contentId])
    return contents[0] || null
  }

  // 读取内容详情并补充标签和图片信息。
  async buildDetail(content) {
    const [tags] = await connectionPool.execute(
      'SELECT t.id, t.name, t.status FROM `tag` t INNER JOIN `content_tag` ct ON ct.tag_id = t.id WHERE ct.content_id = ?;',
      [content.id]
    )
    const [files] = await connectionPool.execute(
      'SELECT f.id, f.url, f.usage_type AS usageType, f.status FROM `file` f INNER JOIN `content_file` cf ON cf.file_id = f.id WHERE cf.content_id = ? AND f.status = ?;',
      [content.id, 'active']
    )
    return { ...toContentItem(content), tags, files }
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

  // 查询公开内容分页列表，访客和普通用户只能看到已公开内容。
  async listPublished(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = [CONTENT_STATUS.PUBLISHED]
    let where = 'WHERE c.status = ?'
    if (query.tagId) {
      where += ' AND EXISTS (SELECT 1 FROM content_tag ct WHERE ct.content_id = c.id AND ct.tag_id = ?)'
      values.push(Number(query.tagId))
    }
    const [list] = await connectionPool.execute(`SELECT c.* FROM \`content\` c ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?;`, [...values, pageSize, offset])
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`content\` c ${where};`, values)
    return { list: list.map(toContentItem), total: countRows[0].total, page, pageSize }
  }

  // 查询公开内容详情，非公开内容对公众表现为不存在。
  async getPublishedDetail(contentId) {
    const content = await this.findById(contentId)
    if (!content || content.status !== CONTENT_STATUS.PUBLISHED) throw createError('NOT_FOUND', '内容不存在')
    return this.buildDetail(content)
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
    return toContentItem(await this.findById(contentId))
  }

  // 管理员驳回待审核内容，并保存可供作者查看的驳回原因。
  async reject(contentId, reviewerId, reason) {
    if (!reason) throw createError('PARAMS_ERROR', '驳回原因不能为空')
    const content = await this.findById(contentId)
    if (!content) throw createError('NOT_FOUND', '内容不存在')
    if (content.status !== CONTENT_STATUS.PENDING) throw createError('INVALID_STATUS')
    await connectionPool.execute('UPDATE `content` SET `status` = ?, `reviewer_id` = ?, `reviewed_at` = NOW(), `reject_reason` = ? WHERE `id` = ?;', [CONTENT_STATUS.REJECTED, reviewerId, reason, contentId])
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
