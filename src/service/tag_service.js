// 标签服务封装 tag 表查询和后台维护业务。
const connectionPool = require('../app/database')
const { TAG_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

class TagService {
  // 查询启用标签分页列表，供用户发布内容时选择。
  async listEnabled(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const [list] = await connectionPool.execute(
      'SELECT id, name, status, created_at AS createdAt, updated_at AS updatedAt FROM `tag` WHERE `status` = ? ORDER BY created_at DESC LIMIT ? OFFSET ?;',
      [TAG_STATUS.ENABLED, pageSize, offset]
    )
    const [countRows] = await connectionPool.execute('SELECT COUNT(*) AS total FROM `tag` WHERE `status` = ?;', [TAG_STATUS.ENABLED])
    return { list, total: countRows[0].total, page, pageSize }
  }

  // 后台分页查询全部标签，允许管理员查看禁用标签并重新启用。
  async listAdmin(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const values = []
    const conditions = []
    if (query.status) {
      conditions.push('status = ?')
      values.push(query.status)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [list] = await connectionPool.execute(
      `SELECT id, name, status, created_at AS createdAt, updated_at AS updatedAt FROM \`tag\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
      [...values, pageSize, offset]
    )
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`tag\` ${where};`, values)
    return { list, total: countRows[0].total, page, pageSize }
  }

  // 按 ID 查询标签，用于后台修改和内容标签校验。
  async findById(tagId) {
    const [tags] = await connectionPool.execute('SELECT * FROM `tag` WHERE `id` = ?;', [tagId])
    return tags[0] || null
  }

  // 新增标签时校验名称非空，重名由唯一索引和前置查询共同保护。
  async createTag(payload = {}) {
    const { name } = payload
    if (!name) throw createError('PARAMS_ERROR', '标签名称不能为空')

    const [exists] = await connectionPool.execute('SELECT id FROM `tag` WHERE `name` = ?;', [name])
    if (exists.length) throw createError('CONFLICT', '标签名称已存在')

    const [result] = await connectionPool.execute('INSERT INTO `tag` (`name`, `status`) VALUES (?, ?);', [name, TAG_STATUS.ENABLED])
    return this.findById(result.insertId)
  }

  // 修改标签名称时校验目标存在和名称冲突。
  async updateTag(tagId, payload = {}) {
    const tag = await this.findById(tagId)
    if (!tag) throw createError('NOT_FOUND', '标签不存在')
    if (!payload.name) throw createError('PARAMS_ERROR', '标签名称不能为空')

    const [exists] = await connectionPool.execute('SELECT id FROM `tag` WHERE `name` = ? AND `id` <> ?;', [payload.name, tagId])
    if (exists.length) throw createError('CONFLICT', '标签名称已存在')

    await connectionPool.execute('UPDATE `tag` SET `name` = ? WHERE `id` = ?;', [payload.name, tagId])
    return this.findById(tagId)
  }

  // 后台启用或禁用标签，禁用标签不能被新内容选择。
  async updateStatus(tagId, status) {
    const tag = await this.findById(tagId)
    if (!tag) throw createError('NOT_FOUND', '标签不存在')

    await connectionPool.execute('UPDATE `tag` SET `status` = ? WHERE `id` = ?;', [status, tagId])
    return this.findById(tagId)
  }

  // 对标签 ID 去重，避免重复标签导致误判或关联表重复插入。
  normalizeTagIds(tagIds = []) {
    return [...new Set(tagIds.map((tagId) => Number(tagId)))]
  }

  // 校验内容发布选择的标签都存在且启用，避免禁用标签被新内容使用。
  async assertEnabledTags(tagIds = []) {
    const uniqueTagIds = this.normalizeTagIds(tagIds)
    if (!uniqueTagIds.length) return []
    const placeholders = uniqueTagIds.map(() => '?').join(',')
    const [tags] = await connectionPool.execute(`SELECT * FROM \`tag\` WHERE \`id\` IN (${placeholders}) AND \`status\` = ?;`, [...uniqueTagIds, TAG_STATUS.ENABLED])
    if (tags.length !== uniqueTagIds.length) throw createError('PARAMS_ERROR', '标签不存在或已禁用')
    return tags
  }
}

module.exports = new TagService()
