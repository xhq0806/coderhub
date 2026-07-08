// 后台控制器聚合用户、内容、评论、标签、文件管理能力，保持后台路由入口统一。
const userController = require('./user_controller')
const contentController = require('./content_controller')
const commentController = require('./comment_controller')
const tagController = require('./tag_controller')
const fileController = require('./file_controller')

// 直接复用各业务 controller 的后台方法，避免重复编写转发逻辑。
module.exports = {
  listUsers: userController.listAdmin.bind(userController),
  disableUser: userController.disable.bind(userController),
  enableUser: userController.enable.bind(userController),
  listContents: contentController.listAdmin.bind(contentController),
  approveContent: contentController.approve.bind(contentController),
  rejectContent: contentController.reject.bind(contentController),
  offlineContent: contentController.offline.bind(contentController),
  deleteContent: contentController.deleteAdmin.bind(contentController),
  listComments: commentController.listAdmin.bind(commentController),
  deleteComment: commentController.deleteAdmin.bind(commentController),
  listTags: tagController.listAdmin.bind(tagController),
  createTag: tagController.create.bind(tagController),
  updateTag: tagController.update.bind(tagController),
  enableTag: tagController.enable.bind(tagController),
  disableTag: tagController.disable.bind(tagController),
  listFiles: fileController.listAdmin.bind(fileController),
  deleteFile: fileController.deleteAdmin.bind(fileController)
}
