// 用户服务封装 user 表相关 SQL 和用户相关业务规则。
const connectionPool = require('../app/database')
const { USER_ROLE, USER_STATUS } = require('../constants/status')
const { createError, parsePage } = require('../utils/response')
const { hashPassword, comparePassword } = require('../utils/password')
const { signToken } = require('../utils/token')

// 过滤数据库敏感字段，避免密码哈希返回给客户端。
function toUserProfile(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    avatarFileId: user.avatar_file_id,
    intro: user.intro,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }
}

class UserService {
  // by AI.Coding：开放用户资料转换能力，供公开主页复用且避免返回密码字段。
  toUserProfile(user) {
    return toUserProfile(user)
  }

  // 按用户名查询用户，用于注册去重和登录认证。
  async findByName(name) {
    const statement = 'SELECT * FROM `user` WHERE `name` = ?;'
    const [users] = await connectionPool.execute(statement, [name])
    return users
  }

  // 按用户 ID 查询用户，用于 token 中间件加载当前登录用户。
  async findById(id) {
    const statement = 'SELECT * FROM `user` WHERE `id` = ?;'
    const [users] = await connectionPool.execute(statement, [id])
    return users[0] || null
  }

  // 注册用户前校验必要参数和用户名唯一性，并保存加密后的密码。
  async create(user) {
    const { name, password } = user
    if (!name || !password) {
      throw createError('PARAMS_ERROR', '用户名或密码不能为空')
    }

    const users = await this.findByName(name)
    if (users.length) {
      throw createError('CONFLICT', '用户名已经存在')
    }

    const hashedPassword = await hashPassword(password)
    const statement = 'INSERT INTO `user` (`name`, `password`, `nickname`, `role`, `status`) VALUES (?, ?, ?, ?, ?);'
    const [result] = await connectionPool.execute(statement, [name, hashedPassword, name, USER_ROLE.USER, USER_STATUS.ACTIVE])
    return { id: result.insertId, name }
  }

  // 登录时统一处理用户不存在和密码错误，避免暴露账号枚举信息。
  async login(credentials) {
    const { name, password } = credentials
    if (!name || !password) {
      throw createError('PARAMS_ERROR', '用户名或密码不能为空')
    }

    const users = await this.findByName(name)
    const user = users[0]
    if (!user) {
      throw createError('AUTH_FAILED')
    }

    if (user.status === USER_STATUS.DISABLED) {
      throw createError('USER_DISABLED')
    }

    const matched = await comparePassword(password, user.password)
    if (!matched) {
      throw createError('AUTH_FAILED')
    }

    return {
      token: signToken(user),
      user: toUserProfile(user)
    }
  }

  // 查询当前用户资料，返回前移除密码字段。
  async getProfile(userId) {
    const user = await this.findById(userId)
    if (!user) {
      throw createError('NOT_FOUND', '用户不存在')
    }
    return toUserProfile(user)
  }

  // 更新当前用户资料，头像文件有效性由上层 service 传入前校验。
  async updateProfile(userId, profile) {
    const fields = []
    const values = []

    if (profile.nickname !== undefined) {
      fields.push('`nickname` = ?')
      values.push(profile.nickname)
    }
    if (profile.avatarFileId !== undefined) {
      fields.push('`avatar_file_id` = ?')
      values.push(profile.avatarFileId)
    }
    if (profile.intro !== undefined) {
      fields.push('`intro` = ?')
      values.push(profile.intro)
    }

    if (!fields.length) {
      throw createError('PARAMS_ERROR', '没有可更新的资料字段')
    }

    values.push(userId)
    await connectionPool.execute(`UPDATE \`user\` SET ${fields.join(', ')} WHERE \`id\` = ?;`, values)
    return this.getProfile(userId)
  }

  // 后台分页查询用户，支持按状态过滤。
  async listUsers(query) {
    const { page, pageSize, offset } = parsePage(query)
    const conditions = []
    const values = []

    if (query.status) {
      conditions.push('`status` = ?')
      values.push(query.status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [list] = await connectionPool.execute(
      `SELECT id, name, nickname, avatar_file_id AS avatarFileId, intro, role, status, created_at AS createdAt, updated_at AS updatedAt FROM \`user\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
      [...values, pageSize, offset]
    )
    const [countRows] = await connectionPool.execute(`SELECT COUNT(*) AS total FROM \`user\` ${where};`, values)

    return { list, total: countRows[0].total, page, pageSize }
  }

  // 后台更新用户状态，用于禁用和恢复用户。
  async updateStatus(userId, status) {
    const user = await this.findById(userId)
    if (!user) {
      throw createError('NOT_FOUND', '用户不存在')
    }

    await connectionPool.execute('UPDATE `user` SET `status` = ? WHERE `id` = ?;', [status, userId])
    return this.getProfile(userId)
  }
}

module.exports = new UserService()
