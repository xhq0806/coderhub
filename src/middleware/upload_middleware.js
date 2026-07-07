// 上传中间件负责保存图片文件，并对文件类型、扩展名、真实文件头和大小进行统一校验。
const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const multer = require('@koa/multer')
const { UPLOAD_DIR, UPLOAD_MAX_SIZE } = require('../config/server')
const { createError } = require('../utils/response')

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
}

// 根据上传用途选择本地子目录，头像和内容图片分目录保存。
function resolveUploadFolder(usageType) {
  return usageType === 'avatar' ? 'avatar' : 'content'
}

// 确保上传目录存在，避免干净部署时空目录未被 Git 跟踪导致首次上传失败。
function ensureUploadFolder(usageType) {
  const uploadFolder = path.resolve(process.cwd(), UPLOAD_DIR, resolveUploadFolder(usageType))
  fs.mkdirSync(uploadFolder, { recursive: true })
  return uploadFolder
}

// 校验 MIME 和扩展名双重白名单，先拦截明显不符合图片类型的请求。
function assertAllowedImage(file) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const allowedExts = ALLOWED_IMAGE_TYPES[file.mimetype]
  if (!allowedExts || !allowedExts.includes(ext)) {
    throw createError('INVALID_FILE_TYPE')
  }
}

// 校验真实文件头，避免伪造 Content-Type 和扩展名上传非图片内容。
function isValidImageMagic(mimetype, buffer) {
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimetype === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimetype === 'image/gif') {
    return buffer.subarray(0, 3).toString('ascii') === 'GIF'
  }
  if (mimetype === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  return false
}

// 上传落盘后再次读取文件头校验，失败时删除已落盘文件并返回文件类型错误。
async function assertUploadedFileMagic(file) {
  const buffer = await fsPromises.readFile(file.path)
  if (!isValidImageMagic(file.mimetype, buffer)) {
    await fsPromises.unlink(file.path).catch(() => {})
    throw createError('INVALID_FILE_TYPE')
  }
}

// multer 存储配置生成服务端文件名，避免原始文件名冲突。
function createStorage(usageType) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      // 每次上传前确认目标目录存在，支持部署后自动创建 uploads 子目录。
      cb(null, ensureUploadFolder(usageType))
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase()
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    }
  })
}

// 创建图片上传中间件，只允许明确白名单图片类型、真实图片文件头和配置内大小。
function imageUploader(fieldName, usageType) {
  const upload = multer({
    storage: createStorage(usageType),
    limits: {
      fileSize: UPLOAD_MAX_SIZE
    },
    fileFilter: (req, file, cb) => {
      try {
        assertAllowedImage(file)
        cb(null, true)
      } catch (error) {
        cb(error)
      }
    }
  })

  return async (ctx, next) => {
    try {
      await upload.single(fieldName)(ctx, async () => {
        // 上传落盘后校验真实图片文件头，确保非图片不会保存为有效业务文件。
        if (ctx.file) {
          await assertUploadedFileMagic(ctx.file)
        }
        await next()
      })
    } catch (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw createError('FILE_TOO_LARGE')
      }
      throw error
    }
  }
}

module.exports = {
  imageUploader,
  isValidImageMagic,
  ensureUploadFolder
}
