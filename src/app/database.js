// 数据库模块统一维护 MySQL 连接配置，避免各个 service 重复创建连接。
const mysql = require('mysql2/promise')
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD
} = require('../config/server')

// 创建全局数据库连接池，service 层复用该连接池执行 SQL。
const connectionPool = mysql.createPool({
  host: MYSQL_HOST || 'localhost',
  port: Number(MYSQL_PORT) || 3306,
  database: MYSQL_DATABASE || 'coderhub',
  user: MYSQL_USER || 'root',
  password: MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10
})

module.exports = connectionPool
