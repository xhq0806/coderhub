// dotenv 用于读取项目根目录下 .env 文件中的环境变量，并挂载到 process.env 对象上
const dotenv = require('dotenv')

// 执行加载逻辑，必须放在读取环境变量代码之前
dotenv.config()

// 从process.env对象中解构出SERVER_PORT并向外导出
module.exports = {
  SERVER_PORT
} = process.env