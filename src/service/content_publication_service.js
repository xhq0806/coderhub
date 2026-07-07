// 内容发布模块集中处理草稿校验和内容资源关联写入。
const tagService = require('./tag_service')
const fileService = require('./file_service')
const { createError } = require('../utils/response')

// 统一校验 ID 数组参数，避免非数组、空值、NaN 或非正整数进入数据库层。
function normalizeIdArray(value, fieldName) {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw createError('PARAMS_ERROR', `${fieldName}必须是数组`)

  const ids = value.map((item) => Number(item))
  const hasInvalidId = ids.some((id) => !Number.isInteger(id) || id <= 0)
  if (hasInvalidId) throw createError('PARAMS_ERROR', `${fieldName}只能包含正整数`)

  return [...new Set(ids)]
}

class ContentPublicationService {
  // 校验内容草稿正文、标签和图片，返回可直接持久化的规范化数据。
  async prepareDraft(userId, payload = {}) {
    const body = payload.body
    const tagIds = normalizeIdArray(payload.tagIds, 'tagIds')
    const fileIds = normalizeIdArray(payload.fileIds, 'fileIds')

    if ((!body || !String(body).trim()) && !fileIds.length) {
      throw createError('PARAMS_ERROR', '内容正文和图片不能同时为空')
    }

    await tagService.assertEnabledTags(tagIds)
    await fileService.assertActiveContentImages(fileIds, userId)

    return {
      body: body || null,
      tagIds,
      fileIds
    }
  }

  // 在事务连接内替换内容标签和图片关联，供创建和编辑流程复用。
  async replaceAssociations(connection, contentId, draft) {
    await connection.execute('DELETE FROM `content_tag` WHERE `content_id` = ?;', [contentId])
    await connection.execute('DELETE FROM `content_file` WHERE `content_id` = ?;', [contentId])

    for (const tagId of draft.tagIds) {
      await connection.execute('INSERT INTO `content_tag` (`content_id`, `tag_id`) VALUES (?, ?);', [contentId, tagId])
    }

    for (const fileId of draft.fileIds) {
      await connection.execute('INSERT INTO `content_file` (`content_id`, `file_id`) VALUES (?, ?);', [contentId, fileId])
    }
  }
}

module.exports = new ContentPublicationService()
