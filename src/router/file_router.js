// 文件路由声明头像图片和内容图片上传接口。
const KoaRouter = require('@koa/router')
const fileController = require('../controller/file_controller')
const { verifyAuth } = require('../middleware/auth_middleware')
const { imageUploader } = require('../middleware/upload_middleware')
const { FILE_USAGE } = require('../constants/status')

const fileRouter = new KoaRouter({ prefix: '/files' })

// 上传头像图片接口，必须登录且文件必须是图片。
fileRouter.post('/avatar', verifyAuth, imageUploader('file', FILE_USAGE.AVATAR), fileController.uploadAvatar)

// 上传内容图片接口，必须登录且文件必须是图片。
fileRouter.post('/content-images', verifyAuth, imageUploader('file', FILE_USAGE.CONTENT_IMAGE), fileController.uploadContentImage)

module.exports = fileRouter
