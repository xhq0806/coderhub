// 后台路由集中声明管理端接口，并统一使用管理员认证中间件保护。
const KoaRouter = require('@koa/router')
const adminController = require('../controller/admin_controller')
const { verifyAdmin } = require('../middleware/auth_middleware')

const adminRouter = new KoaRouter({ prefix: '/admin' })

// 所有后台接口必须先通过管理员认证。
adminRouter.use(verifyAdmin)

// 后台用户管理接口。
adminRouter.get('/users', adminController.listUsers)
adminRouter.patch('/users/:id/disable', adminController.disableUser)
adminRouter.patch('/users/:id/enable', adminController.enableUser)

// 后台内容审核和治理接口。
adminRouter.get('/contents', adminController.listContents)
adminRouter.patch('/contents/:id/approve', adminController.approveContent)
adminRouter.patch('/contents/:id/reject', adminController.rejectContent)
adminRouter.patch('/contents/:id/offline', adminController.offlineContent)
adminRouter.delete('/contents/:id', adminController.deleteContent)

// 后台评论治理接口。
adminRouter.get('/comments', adminController.listComments)
adminRouter.delete('/comments/:id', adminController.deleteComment)

// 后台标签维护接口。
adminRouter.get('/tags', adminController.listTags)
adminRouter.post('/tags', adminController.createTag)
adminRouter.patch('/tags/:id', adminController.updateTag)
adminRouter.patch('/tags/:id/enable', adminController.enableTag)
adminRouter.patch('/tags/:id/disable', adminController.disableTag)

// 后台文件管理接口。
adminRouter.get('/files', adminController.listFiles)
adminRouter.delete('/files/:id', adminController.deleteFile)

module.exports = adminRouter
