const app = require('./app/index.js')
const {SERVER_PORT}  = require('./config/server')
// 监听 8000 端口，启动成功后打印日志
app.listen(SERVER_PORT, () => {
  console.log('coderhub的服务器启动成功~')
})