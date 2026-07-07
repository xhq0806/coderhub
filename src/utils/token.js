// token 工具封装 jsonwebtoken，统一签发和校验登录凭证。
const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/server')
const { createError } = require('./response')

// 签发登录 token，只放入用户 ID 和角色等必要身份信息。
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// 校验 token 有效性，失败时抛出未认证业务错误。
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw createError('UNAUTHORIZED')
  }
}

module.exports = {
  signToken,
  verifyToken
}
