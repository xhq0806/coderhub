// dotenv 用于读取项目根目录下 .env 文件中的环境变量，并挂载到 process.env 对象上。
const dotenv = require('dotenv')

// 执行加载逻辑，必须放在读取环境变量代码之前。
dotenv.config()

const {
  NODE_ENV,
  SERVER_PORT,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  UPLOAD_DIR,
  UPLOAD_PUBLIC_PATH,
  UPLOAD_MAX_SIZE
} = process.env

// 非测试环境必须显式配置 JWT_SECRET，避免使用公开默认密钥导致 token 可伪造。
if (NODE_ENV !== 'test' && !JWT_SECRET) {
  throw new Error('JWT_SECRET 必须在 .env 中配置')
}

// 显式导出服务、数据库、认证和上传配置，避免其它模块依赖 process.env 的隐式副作用。
module.exports = {
  NODE_ENV: NODE_ENV || 'development',
  SERVER_PORT: SERVER_PORT || 8000,
  MYSQL_HOST: MYSQL_HOST || 'localhost',
  MYSQL_PORT: MYSQL_PORT || 3306,
  MYSQL_DATABASE: MYSQL_DATABASE || 'coderhub',
  MYSQL_USER: MYSQL_USER || 'root',
  MYSQL_PASSWORD,
  JWT_SECRET: JWT_SECRET || 'coderhub-test-secret',
  JWT_EXPIRES_IN: JWT_EXPIRES_IN || '24h',
  UPLOAD_DIR: UPLOAD_DIR || 'uploads',
  UPLOAD_PUBLIC_PATH: UPLOAD_PUBLIC_PATH || '/uploads',
  UPLOAD_MAX_SIZE: Number(UPLOAD_MAX_SIZE) || 2 * 1024 * 1024
}
