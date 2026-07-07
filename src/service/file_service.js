// 文件服务封装上传文件元信息保存、查询和后台删除逻辑。
const fs = require('fs/promises')
const path = require('path')
const connectionPool = require('../app/database')
const { UPLOAD_DIR, UPLOAD_PUBLIC_PATH } = require('../config/server')
const { FILE_STATUS, FILE_USAGE } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')

class FileService {
  // 保存上传文件元信息，实际文件已由上传中间件写入本地 uploads 目录。
  async createFile(userId, usageType, file) {
    if (!file) throw createError('PARAMS_ERROR', '上传文件不能为空')

    const folder = usageType === FILE_USAGE.AVATAR ? 'avatar' : 'content'
    const url = path.posix.join(UPLOAD_PUBLIC_PATH, folder, file.filename)
    const statement = 'INSERT INTO `file` (`user_id`, `usage_type`, `filename`, `original_name`, `mime_type`, `size`, `url`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?);'
    const [result] = await connectionPool.execute(statement, [userId, usageType, file.filename, file.originalname, file.mimetype, file.size, url, FILE_STATUS.ACTIVE])
    return this.findActiveById(result.insertId)
  }

  // 查询未删除文件，用于头像引用、内容图片引用和接口返回。
  async findActiveById(fileId) {
    const [files] = await connectionPool.execute(
      'SELECT id, user_id AS userId, usage_type AS usageType, filename, original_name AS originalName, mime_type AS mimeType, size, url, status, created_at AS createdAt, updated_at AS updatedAt FROM `file` WHERE `id` = ? AND `status` = ?;',
      [fileId, FILE_STATUS.ACTIVE]
    )
    return files[0] || null
  }

  // 按公开 URL 查询未删除文件，静态访问层用它阻止 deleted 文件继续访问。
  async findActiveByUrl(url) {
    const [files] = await connectionPool.execute(
      'SELECT id, user_id AS userId, usage_type AS usageType, filename, original_name AS originalName, mime_type AS mimeType, size, url, status FROM `file` WHERE `url` = ? AND `status` = ?;',
      [url, FILE_STATUS.ACTIVE]
    )
    return files[0] || null
  }

  // 校验头像文件必须存在、用途正确且归属当前用户，防止引用他人文件或内容图片。
  async assertActiveAvatar(fileId, userId) {
    const [files] = await connectionPool.execute(
      'SELECT id FROM `file` WHERE `id` = ? AND `user_id` = ? AND `usage_type` = ? AND `status` = ?;',
      [fileId, userId, FILE_USAGE.AVATAR, FILE_STATUS.ACTIVE]
    )
    if (!files.length) throw createError('NOT_FOUND', '头像文件不存在')
  }

  // 校验内容图片文件都存在、用途正确且归属当前用户，避免引用他人文件或已删除文件。
  async assertActiveContentImages(fileIds = [], userId) {
    const uniqueFileIds = [...new Set(fileIds)]
    if (!uniqueFileIds.length) return []
    const placeholders = uniqueFileIds.map(() => '?').join(',')
    const [files] = await connectionPool.execute(
      `SELECT * FROM \`file\` WHERE \`id\` IN (${placeholders}) AND \`user_id\` = ? AND \`usage_type\` = ? AND \`status\` = ?;`,
      [...uniqueFileIds, userId, FILE_USAGE.CONTENT_IMAGE, FILE_STATUS.ACTIVE]
    )
    if (files.length !== uniqueFileIds.length) throw createError('NOT_FOUND', '内容图片文件不存在')
    return files
  }

  // 后台分页查询文件，支持按用途过滤。
  async listAdmin(query = {}) {
    const { page, pageSize, offset } = parsePage(query)
    const conditions = []
    const values = []
    if (query.usageType) {
      conditions.push('usage_type = ?')
      values.push(query.usageType)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [list] = await connectionPool.execute(
      `SELECT id, user_id AS userId, usage_type AS usageType, filename, original_name AS originalName, mime_type AS mimeType, size, url, status, created_at AS createdAt, updated_at AS updatedAt FROM \`file\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
      [...values, pageSize, offset]
    )
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`file\` ${where};`, values)
    return { list, total: countRows[0].total, page, pageSize }
  }

  // 根据文件 URL 还原磁盘路径，后台删除文件时同步移除物理文件。
  resolveDiskPath(file) {
    const relativePath = String(file.url || '').replace(new RegExp(`^${UPLOAD_PUBLIC_PATH}/?`), '')
    return path.resolve(process.cwd(), UPLOAD_DIR, relativePath)
  }

  // 后台软删除文件并清理用户头像引用，静态访问层会按数据库状态拒绝旧 URL。
  async deleteByAdmin(fileId) {
    const file = await this.findActiveById(fileId)
    if (!file) throw createError('NOT_FOUND', '文件不存在')

    const connection = await connectionPool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('UPDATE `file` SET `status` = ? WHERE `id` = ?;', [FILE_STATUS.DELETED, fileId])
      await connection.execute('UPDATE `user` SET `avatar_file_id` = NULL WHERE `avatar_file_id` = ?;', [fileId])
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    // 磁盘文件删除失败不影响访问控制，因为静态层会根据数据库 deleted 状态拒绝旧 URL。
    try {
      await fs.unlink(this.resolveDiskPath(file))
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('删除磁盘文件失败:', error.message)
    }

    return { ...file, status: FILE_STATUS.DELETED }
  }
}

module.exports = new FileService()
