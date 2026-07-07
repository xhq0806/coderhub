// 文件生命周期模块集中处理文件可见性、磁盘路径和删除副作用。
const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const fileService = require('./file_service')
const connectionPool = require('../app/database')
const { UPLOAD_DIR, UPLOAD_PUBLIC_PATH } = require('../config/server')
const { FILE_STATUS } = require('../constants/status')
const { createError } = require('../utils/response')

class FileLifecycleService {
  // 按公开 URL 查询可访问文件，并把非法或已删除文件统一视为不可见。
  async findServableFile(url) {
    return fileService.findActiveByUrl(url)
  }

  // 将公开 URL 转换为 uploads 下的安全磁盘路径，阻止路径穿越访问。
  resolvePublicDiskPath(url) {
    const relativePath = String(url || '').slice(UPLOAD_PUBLIC_PATH.length).replace(/^\//, '')
    const uploadRoot = path.resolve(process.cwd(), UPLOAD_DIR)
    const filePath = path.resolve(uploadRoot, relativePath)
    const safeRelativePath = path.relative(uploadRoot, filePath)

    if (safeRelativePath.startsWith('..') || path.isAbsolute(safeRelativePath)) {
      return null
    }

    return filePath
  }

  // 静态资源层只需要调用一个接口即可完成数据库状态和磁盘路径双重校验。
  async resolveServableDiskPath(url) {
    const activeFile = await this.findServableFile(url)
    if (!activeFile) return null

    const filePath = this.resolvePublicDiskPath(url)
    if (!filePath || !fs.existsSync(filePath)) return null

    return filePath
  }

  // 后台删除文件时同时处理数据库状态、用户头像引用和磁盘文件清理。
  async deleteByAdmin(fileId) {
    const file = await fileService.findActiveById(fileId)
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

    // 磁盘删除失败不改变业务删除结果；静态访问已由数据库状态阻断。
    const filePath = this.resolvePublicDiskPath(file.url)
    if (filePath) {
      try {
        await fsPromises.unlink(filePath)
      } catch (error) {
        // Windows 上刚访问过的图片可能短暂锁定；数据库 deleted 状态已经阻断旧 URL。
        if (!['ENOENT', 'EPERM'].includes(error.code)) console.warn('删除磁盘文件失败:', error.message)
      }
    }

    return { ...file, status: FILE_STATUS.DELETED }
  }
}

module.exports = new FileLifecycleService()
