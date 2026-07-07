// 密码工具封装 bcryptjs，避免用户 service 直接依赖加密库细节。
const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 10

// 对明文密码进行哈希处理，数据库只保存哈希后的密码。
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 比对明文密码和哈希密码，用于登录认证。
async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

module.exports = {
  hashPassword,
  comparePassword
}
