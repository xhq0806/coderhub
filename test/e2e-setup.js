// by AI.Coding：E2E 初始化脚本只允许重建 _e2e 数据库，并创建固定主链路数据。
process.env.NODE_ENV = 'test'
process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'coderhub_e2e'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'coderhub-e2e-secret'
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads_e2e'

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const { hashPassword } = require('../src/utils/password')
const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = require('../src/config/server')

// by AI.Coding：破坏性初始化前严格校验数据库后缀，防止误清开发或生产库。
async function setupE2E() {
  if (!MYSQL_DATABASE.endsWith('_e2e')) throw new Error(`E2E 数据库名称必须以 _e2e 结尾，当前为 ${MYSQL_DATABASE}`)
  const schema = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf8').replace(/`coderhub`/g, `\`${MYSQL_DATABASE}\``)
  const adminPassword = await hashPassword('Admin123456')
  const userPassword = await hashPassword('123456')
  const connection = await mysql.createConnection({ host: MYSQL_HOST, port: Number(MYSQL_PORT), user: MYSQL_USER, password: MYSQL_PASSWORD, multipleStatements: true })
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;`)
    await connection.query(schema)
    await connection.query(`USE \`${MYSQL_DATABASE}\`;`)
    await connection.execute('INSERT INTO `user` (`name`, `password`, `nickname`, `role`, `status`) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?);', ['admin', adminPassword, '管理员', 'admin', 'active', 'alice', userPassword, 'Alice', 'user', 'active'])
    await connection.execute('INSERT INTO `tag` (`name`, `status`) VALUES (?, ?);', ['Node.js', 'enabled'])
    await connection.execute('INSERT INTO `content` (`user_id`, `body`, `status`, `reviewer_id`, `reviewed_at`) VALUES (?, ?, ?, ?, NOW());', [2, 'E2E 公开动态', 'published', 1])
    await connection.execute('INSERT INTO `content_tag` (`content_id`, `tag_id`) VALUES (?, ?);', [1, 1])
  } finally {
    await connection.end()
  }
}

setupE2E().then(() => console.log('E2E 数据初始化完成')).catch((error) => { console.error(error); process.exitCode = 1 })
