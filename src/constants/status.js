// 统一维护业务状态枚举，避免各模块硬编码状态字符串。
const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled'
}

const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin'
}

const CONTENT_STATUS = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  OFFLINE: 'offline',
  DELETED: 'deleted'
}

const COMMENT_STATUS = {
  VISIBLE: 'visible',
  DELETED: 'deleted'
}

const TAG_STATUS = {
  ENABLED: 'enabled',
  DISABLED: 'disabled'
}

const FILE_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted'
}

const FILE_USAGE = {
  AVATAR: 'avatar',
  CONTENT_IMAGE: 'content_image'
}

// 导出所有状态常量，供 service 校验状态流转和查询条件。
module.exports = {
  USER_STATUS,
  USER_ROLE,
  CONTENT_STATUS,
  COMMENT_STATUS,
  TAG_STATUS,
  FILE_STATUS,
  FILE_USAGE
}
