// 核心系统接口测试脚本，负责初始化独立测试库并验证主要业务链路。
process.env.NODE_ENV = 'test'
process.env.MYSQL_DATABASE = 'coderhub_test'
process.env.JWT_SECRET = 'coderhub-test-secret'
process.env.UPLOAD_DIR = 'uploads_test'

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const request = require('supertest')
const mysql = require('mysql2/promise')
const app = require('../src/app')
const connectionPool = require('../src/app/database')
const { hashPassword } = require('../src/utils/password')
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE
} = require('../src/config/server')

// 构造最小 PNG 文件内容，供头像和内容图片上传接口测试。
const PNG_BUFFER = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000150270a0d0000000049454e44ae426082', 'hex')

// 构造伪装成 PNG 的文本内容，用于验证真实文件头校验。
const FAKE_PNG_BUFFER = Buffer.from('this is not a real png file')

// 测试清库只允许操作 _test 后缀数据库，防止误删本地开发库。
function assertTestDatabase() {
  assert.ok(MYSQL_DATABASE.endsWith('_test'), `测试数据库名称必须以 _test 结尾，当前为 ${MYSQL_DATABASE}`)
}

// 执行 schema.sql 到独立测试库，测试库允许先删除再重建。
async function initDatabase() {
  assertTestDatabase()
  const schema = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf8').replace(/`coderhub`/g, `\`${MYSQL_DATABASE}\``)
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true
  })

  // 破坏性 DROP DATABASE 仅作用于 coderhub_test，避免 npm test 清空真实开发数据。
  await connection.query(`DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;`)
  await connection.query(schema)
  await connection.end()

  // 删除测试上传目录，验证上传中间件能在首次上传前自动创建目录。
  fs.rmSync(path.resolve(__dirname, '../uploads_test'), { recursive: true, force: true })
}

// 创建管理员账号，供后台接口测试使用。
async function createAdminUser() {
  const password = await hashPassword('Admin123456')
  await connectionPool.execute(
    'INSERT INTO `user` (`name`, `password`, `nickname`, `role`, `status`) VALUES (?, ?, ?, ?, ?);',
    ['admin', password, 'admin', 'admin', 'active']
  )
}

// 简化断言响应成功的重复逻辑。
function assertSuccess(response) {
  assert.strictEqual(response.body.code, 0, response.text)
  return response.body.data
}

// 登录并返回 token，减少测试用例中的重复请求。
async function login(server, name, password) {
  const loginRes = await request(server).post('/login').send({ name, password }).expect(200)
  return assertSuccess(loginRes)
}

// 上传 PNG 图片并返回文件记录，覆盖真实 multipart 上传链路。
async function uploadImage(server, token, url, filename) {
  const response = await request(server)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', PNG_BUFFER, filename)
    .expect(200)
  return assertSuccess(response)
}

// 测试用户注册、登录、管理员维护标签、内容审核和评论主链路。
async function testCoreFlow() {
  const server = app.callback()

  const registerRes = await request(server)
    .post('/users')
    .send({ name: 'alice', password: '123456' })
    .expect(200)
  assertSuccess(registerRes)

  const duplicateRes = await request(server)
    .post('/users')
    .send({ name: 'alice', password: '123456' })
    .expect(409)
  assert.strictEqual(duplicateRes.body.code, -1002)

  const loginData = await login(server, 'alice', '123456')
  assert.ok(loginData.token)

  const adminData = await login(server, 'admin', 'Admin123456')

  const forbiddenRes = await request(server)
    .get('/admin/users')
    .set('Authorization', `Bearer ${loginData.token}`)
    .expect(403)
  assert.strictEqual(forbiddenRes.body.code, -1006)

  const tagRes = await request(server)
    .post('/admin/tags')
    .set('Authorization', `Bearer ${adminData.token}`)
    .send({ name: 'Node.js' })
    .expect(200)
  const tag = assertSuccess(tagRes)

  const avatarFile = await uploadImage(server, loginData.token, '/files/avatar', 'avatar.png')
  const profileRes = await request(server)
    .patch('/users/me')
    .set('Authorization', `Bearer ${loginData.token}`)
    .send({ nickname: 'Alice', avatarFileId: avatarFile.id, intro: '热爱 Node.js' })
    .expect(200)
  assert.strictEqual(assertSuccess(profileRes).avatarFileId, avatarFile.id)

  const contentImage = await uploadImage(server, loginData.token, '/files/content-images', 'content.png')
  const contentRes = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${loginData.token}`)
    .send({ body: '今天学习 Koa 很开心', tagIds: [tag.id], fileIds: [contentImage.id] })
    .expect(200)
  const content = assertSuccess(contentRes)
  assert.strictEqual(content.status, 'pending')

  const beforeApproveRes = await request(server).get('/contents').expect(200)
  assert.strictEqual(assertSuccess(beforeApproveRes).total, 0)

  await request(server)
    .patch(`/admin/contents/${content.id}/approve`)
    .set('Authorization', `Bearer ${adminData.token}`)
    .expect(200)

  const afterApproveRes = await request(server).get('/contents').expect(200)
  assert.strictEqual(assertSuccess(afterApproveRes).total, 1)

  const commentRes = await request(server)
    .post(`/contents/${content.id}/comments`)
    .set('Authorization', `Bearer ${loginData.token}`)
    .send({ body: '欢迎交流' })
    .expect(200)
  const comment = assertSuccess(commentRes)
  assert.strictEqual(comment.body, '欢迎交流')

  const replyRes = await request(server)
    .post(`/comments/${comment.id}/replies`)
    .set('Authorization', `Bearer ${loginData.token}`)
    .send({ body: '好的' })
    .expect(200)
  const reply = assertSuccess(replyRes)
  assert.strictEqual(reply.parentId, comment.id)

  return { server, adminData, loginData, tag, content, comment, contentImage }
}

// 测试文件删除后旧 URL 不再可访问，覆盖违规文件治理路径。
async function testDeletedFileNotAccessible(server, adminToken, file) {
  await request(server).get(file.url).expect(200)
  await request(server)
    .delete(`/admin/files/${file.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
  await request(server).get(file.url).expect(404)
}

// 测试文件归属和用途限制，防止用户引用他人文件或用内容图片冒充头像。
async function testFileOwnership(server, aliceToken, tag) {
  await request(server).post('/users').send({ name: 'bob', password: '123456' }).expect(200)
  const bobData = await login(server, 'bob', '123456')
  const aliceContentImage = await uploadImage(server, aliceToken, '/files/content-images', 'alice-content.png')

  const wrongAvatarRes = await request(server)
    .patch('/users/me')
    .set('Authorization', `Bearer ${bobData.token}`)
    .send({ avatarFileId: aliceContentImage.id })
    .expect(404)
  assert.strictEqual(wrongAvatarRes.body.code, -1007)

  const wrongContentRes = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${bobData.token}`)
    .send({ body: '尝试引用他人图片', tagIds: [tag.id], fileIds: [aliceContentImage.id] })
    .expect(404)
  assert.strictEqual(wrongContentRes.body.code, -1007)
}

// 测试伪造图片上传会被真实文件头校验拦截，并且不会创建有效文件记录。
async function testFakeImageRejected(server, token) {
  const response = await request(server)
    .post('/files/content-images')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', FAKE_PNG_BUFFER, 'fake.png')
    .expect(400)
  assert.strictEqual(response.body.code, -1009)
}

// 测试数据库标记 deleted 后即使磁盘文件残留，旧 URL 也不能继续访问。
async function testDeletedStatusBlocksStaticAccess(server, file) {
  await connectionPool.execute('UPDATE `file` SET `status` = ? WHERE `id` = ?;', ['deleted', file.id])
  await request(server).get(file.url).expect(404)
}

// 测试删除头像文件会清空用户头像引用，避免已删除文件继续作为头像展示。
async function testDeletingAvatarClearsProfile(server, adminToken, userToken) {
  const avatar = await uploadImage(server, userToken, '/files/avatar', 'avatar-clear.png')
  await request(server)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ avatarFileId: avatar.id })
    .expect(200)
  await request(server)
    .delete(`/admin/files/${avatar.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
  const profileRes = await request(server)
    .get('/users/me')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(200)
  assert.strictEqual(assertSuccess(profileRes).avatarFileId, null)
}

// 测试重复标签 ID 会被去重处理，不会误判为禁用标签或触发关联表重复。
async function testDuplicateTagIdsAccepted(server, userToken, tagId) {
  const response = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ body: '重复标签会被去重', tagIds: [tagId, tagId], fileIds: [] })
    .expect(200)
  assert.strictEqual(assertSuccess(response).status, 'pending')
}

// 测试非法 tagIds 和 fileIds 参数会返回参数错误，不会抛出数据库或运行时 500。
async function testInvalidIdArrays(server, token) {
  const invalidTagRes = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${token}`)
    .send({ body: '非法标签参数', tagIds: '1', fileIds: [] })
    .expect(400)
  assert.strictEqual(invalidTagRes.body.code, -1001)

  const invalidFileRes = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${token}`)
    .send({ body: '非法文件参数', tagIds: [], fileIds: ['abc'] })
    .expect(400)
  assert.strictEqual(invalidFileRes.body.code, -1001)
}

// 测试标签禁用、内容驳回下架删除和评论删除等治理路径。
async function testGovernancePaths(server, adminToken, userToken, tag, content, comment) {
  await request(server)
    .patch(`/admin/tags/${tag.id}/disable`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  const disabledTagRes = await request(server)
    .post('/contents')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ body: '禁用标签不可使用', tagIds: [tag.id], fileIds: [] })
    .expect(400)
  assert.strictEqual(disabledTagRes.body.code, -1001)

  await request(server)
    .delete(`/comments/${comment.id}`)
    .set('Authorization', `Bearer ${userToken}`)
    .expect(200)
  const commentsAfterDelete = await request(server).get(`/contents/${content.id}/comments`).expect(200)
  assert.strictEqual(assertSuccess(commentsAfterDelete).total, 1)

  await request(server)
    .patch(`/admin/contents/${content.id}/offline`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
  await request(server).get(`/contents/${content.id}`).expect(404)

  const mineAfterOffline = await request(server)
    .get('/users/me/contents?status=published')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(200)
  assert.strictEqual(assertSuccess(mineAfterOffline).total, 0)
}

// 测试禁用用户后无法登录，覆盖账号禁用失败路径。
async function testDisabledUser(server, adminToken) {
  const usersRes = await request(server)
    .get('/admin/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
  const users = assertSuccess(usersRes)
  const alice = users.list.find((user) => user.name === 'alice')

  await request(server)
    .patch(`/admin/users/${alice.id}/disable`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)

  const disabledLoginRes = await request(server)
    .post('/login')
    .send({ name: 'alice', password: '123456' })
    .expect(403)
  assert.strictEqual(disabledLoginRes.body.code, -1005)
}

// 主测试入口按顺序执行初始化和核心链路测试。
async function main() {
  await initDatabase()
  await createAdminUser()
  const { server, adminData, loginData, tag, content, comment, contentImage } = await testCoreFlow()
  await testFakeImageRejected(server, loginData.token)
  const residualFile = await uploadImage(server, loginData.token, '/files/content-images', 'residual.png')
  await testDeletedStatusBlocksStaticAccess(server, residualFile)
  await testDeletingAvatarClearsProfile(server, adminData.token, loginData.token)
  await testDuplicateTagIdsAccepted(server, loginData.token, tag.id)
  await testInvalidIdArrays(server, loginData.token)
  await testDeletedFileNotAccessible(server, adminData.token, contentImage)
  await testFileOwnership(server, loginData.token, tag)
  await testGovernancePaths(server, adminData.token, loginData.token, tag, content, comment)
  await testDisabledUser(server, adminData.token)
  await connectionPool.end()
  console.log('核心系统接口测试通过')
}

main().catch(async (error) => {
  console.error(error)
  await connectionPool.end()
  process.exit(1)
})
