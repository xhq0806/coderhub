# coderhub

coderhub 是一个面向程序员的生活动态分享平台，当前包含 Node.js + Koa + MySQL 后端服务，以及 React + Vite + TypeScript 用户端前端应用。当前版本覆盖用户注册登录、内容发布审核、评论回复、标签维护、图片上传、个人资料维护和后台管理等核心系统能力。

## 功能范围

- 用户管理：注册、登录、当前用户信息、资料维护、账号禁用和恢复。
- 内容管理：发布动态、待审核流转、公开列表和详情、作者编辑删除、后台审核/驳回/下架/删除。
- 评论系统：公开内容评论、回复评论、按权限删除评论、后台评论治理。
- 标签系统：用户端查询启用标签，后台新增、修改、启用、禁用标签。
- 文件系统：头像图片和内容图片上传，后台文件查询和删除，删除后旧 URL 不再可访问。
- 后台管理：管理员分页管理用户、内容、评论、标签和文件。
- 用户端前端：公开动态浏览、注册登录、图片上传、发布动态、我的内容、评论回复、个人资料维护、搜索筛选、点赞收藏、用户关注、个人主页和站内通知。

当前不包含私信、推荐算法、第三方登录、短信/邮箱验证、找回密码和细粒度 RBAC。

## 技术栈

- Runtime: Node.js
- Web 框架: Koa
- 路由: `@koa/router`
- 数据库: MySQL
- 数据库驱动: `mysql2`
- 鉴权: JWT
- 密码加密: `bcryptjs`
- 文件上传: `@koa/multer`
- 接口测试: `supertest`
- 前端: React、Vite、TypeScript、React Router

## 目录结构

```text
.
├── database/schema.sql          # 数据库建库建表脚本
├── web                           # React 用户端前端工程
├── src
│   ├── app                      # Koa app 和数据库连接
│   ├── config                   # 环境配置
│   ├── constants                # 错误码和业务状态常量
│   ├── controller               # HTTP 请求处理
│   ├── middleware               # 认证、上传、错误处理中间件
│   ├── router                   # 用户端和后台路由
│   ├── service                  # 业务规则和数据访问
│   └── utils                    # 响应、密码、token 工具
├── test/core-systems.test.js    # 核心链路接口测试
└── uploads                      # 本地上传文件目录
```

## 环境变量

复制 `.env.example` 为 `.env`，并按本地环境修改：

```env
SERVER_PORT=8000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=coderhub
MYSQL_USER=root
MYSQL_PASSWORD=your_password
JWT_SECRET=replace-with-a-secure-secret
JWT_EXPIRES_IN=24h
UPLOAD_DIR=uploads
UPLOAD_PUBLIC_PATH=/uploads
UPLOAD_MAX_SIZE=2097152
```

非测试环境必须配置 `JWT_SECRET`。

## 初始化

安装后端依赖：

```bash
npm install
```

安装前端依赖：

```bash
npm run web:install
```

初始化数据库：

```bash
mysql -u root -p < database/schema.sql
```

启动后端服务：

```bash
npm start
```

默认监听端口由 `SERVER_PORT` 控制，未配置时为 `8000`。

启动用户端前端：

```bash
npm run web:dev
```

前端默认运行在 `http://localhost:5173`。开发环境默认通过 Vite proxy 转发 `/users`、`/login`、`/contents`、`/comments`、`/tags`、`/files`、`/interactions`、`/notifications` 和 `/uploads` 到 `http://localhost:8000`，因此本地联调时无需后端额外配置 CORS。

如需让前端直连其它后端地址，在 `web/.env` 中配置：

```env
VITE_API_BASE_URL=http://localhost:8000
```

构建前端：

```bash
npm run web:build
```

预览构建产物：

```bash
npm run web:preview
```

## 测试

运行核心接口测试：

```bash
npm test
```

测试会使用 `coderhub_test` 数据库，并在执行前重建测试库。测试脚本要求测试数据库名以 `_test` 结尾，避免误删开发库。

在 Windows 环境中，如果清理 `uploads_test` 时遇到 `EPERM` 文件锁问题，关闭占用文件的程序后重试；必要时用管理员权限终端运行测试。

## 认证方式

登录成功后接口返回 `token`。访问受保护接口时，在请求头中携带：

```http
Authorization: Bearer <token>
```

普通用户可访问用户端写操作。后台接口必须使用管理员账号 token。

## 统一响应

成功响应：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {}
}
```

分页响应的 `data` 包含：

```json
{
  "list": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

主要错误码：

| code | 含义 |
|------|------|
| -1001 | 参数错误 |
| -1002 | 资源已存在 |
| -1003 | 用户名或密码错误 |
| -1004 | 未认证或登录已过期 |
| -1005 | 账号已被禁用 |
| -1006 | 无权限操作 |
| -1007 | 资源不存在 |
| -1008 | 当前状态不允许该操作 |
| -1009 | 文件类型错误 |
| -1010 | 文件大小超出限制 |
| -1500 | 服务端错误 |

## 用户端前端

前端工程位于 `web/`，包含普通用户端和管理员治理端。

已实现页面：

| 路由 | 说明 |
|------|------|
| `/` | 公开动态列表，支持分页、关键词搜索、标签筛选和最新/最热排序 |
| `/contents/:id` | 公开动态详情、图片、标签、互动和评论 |
| `/users/:id` | 用户公开主页、关注/粉丝数和公开动态 |
| `/register` | 用户注册 |
| `/login` | 用户登录 |
| `/publish` | 登录用户发布待审核动态 |
| `/my/contents` | 我的内容状态、驳回原因、编辑和删除 |
| `/my/favorites` | 我的收藏内容列表 |
| `/notifications` | 站内通知、未读状态和已读操作 |
| `/profile` | 昵称、头像和简介维护 |
| `/admin` | 管理端总览，仅管理员可访问 |
| `/admin/users` | 用户禁用和恢复 |
| `/admin/contents` | 内容审核、驳回、下架和删除 |
| `/admin/comments` | 评论治理 |
| `/admin/tags` | 标签新增、修改、启用和禁用 |
| `/admin/files` | 上传文件预览和删除 |

前端统一按后端 `{ code, message, data }` 响应解析，登录过期或账号禁用时会清理本地登录态。第三阶段用户端支持搜索筛选、点赞收藏、用户主页关注和站内通知。

管理端复用登录页和 token。只有 `role = admin` 的账号可以访问 `/admin` 路由组；普通用户访问会显示无权限状态。

## 用户端接口

### 用户

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/users` | 否 | 用户注册 |
| POST | `/login` | 否 | 用户登录 |
| GET | `/users/me` | 是 | 查询当前用户资料 |
| PATCH | `/users/me` | 是 | 修改昵称、头像、简介 |
| GET | `/users/me/contents` | 是 | 查询自己的内容列表，可查看待审核和驳回内容 |
| GET | `/users/me/favorites` | 是 | 查询自己收藏的公开内容 |
| GET | `/users/:id/profile` | 否 | 查询用户公开主页资料、关注数和粉丝数 |
| GET | `/users/:id/contents` | 否 | 查询指定用户已公开动态 |
| POST | `/users/:id/follow` | 是 | 关注用户 |
| DELETE | `/users/:id/follow` | 是 | 取消关注用户 |

注册请求示例：

```json
{
  "name": "alice",
  "password": "123456"
}
```

资料更新请求示例：

```json
{
  "nickname": "Alice",
  "avatarFileId": 1,
  "intro": "热爱 Node.js"
}
```

### 标签

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/tags` | 否 | 分页查询启用标签 |

### 文件

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/files/avatar` | 是 | 上传头像图片 |
| POST | `/files/content-images` | 是 | 上传内容图片 |

上传字段名为 `file`，仅支持图片文件。系统会校验 MIME、扩展名、真实文件头和大小限制。

### 内容

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/contents` | 是 | 发布动态，创建后进入待审核 |
| GET | `/contents` | 否 | 分页查询已公开内容，支持关键词、标签和排序 |
| GET | `/contents/:id` | 否 | 查询已公开内容详情，包含互动计数和当前用户互动状态 |
| PATCH | `/contents/:id` | 是 | 作者编辑自己的待审核或已驳回内容 |
| DELETE | `/contents/:id` | 是 | 作者删除自己的内容 |
| POST | `/contents/:id/comments` | 是 | 对公开内容发表评论 |
| GET | `/contents/:id/comments` | 否 | 分页查询公开内容评论 |

发布内容请求示例：

```json
{
  "body": "今天学习 Koa 很开心",
  "tagIds": [1, 2],
  "fileIds": [3]
}
```

内容状态包括：

| 状态 | 含义 |
|------|------|
| `pending` | 待审核 |
| `published` | 已公开 |
| `rejected` | 已驳回 |
| `offline` | 已下架 |
| `deleted` | 已删除 |

只有 `published` 内容会出现在公开列表和公开详情中。作者可通过 `/users/me/contents` 查看自己的 `pending`、`rejected` 和 `published` 内容。

### 评论

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/comments/:id/replies` | 是 | 回复已存在且可见的评论 |
| DELETE | `/comments/:id` | 是 | 删除评论 |

评论作者可以删除自己的评论；内容作者可以删除自己内容下的评论。被删除的评论不会在普通用户评论列表中展示，也不能继续作为回复目标。

### 互动

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/contents/:id/likes` | 是 | 点赞公开内容 |
| DELETE | `/contents/:id/likes` | 是 | 取消点赞 |
| POST | `/contents/:id/favorites` | 是 | 收藏公开内容 |
| DELETE | `/contents/:id/favorites` | 是 | 取消收藏 |

点赞和收藏只允许作用于已公开内容，重复操作按幂等处理。首次点赞、收藏会向内容作者生成通知，用户自己的内容不会给自己发送通知。

### 通知

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/notifications` | 是 | 查询当前用户通知列表 |
| GET | `/notifications/unread-count` | 是 | 查询当前用户未读通知数 |
| PATCH | `/notifications/:id/read` | 是 | 标记单条通知已读 |
| PATCH | `/notifications/read-all` | 是 | 标记当前用户全部通知已读 |

通知覆盖审核通过、审核驳回、评论、回复、点赞、收藏和关注等业务事件。用户只能读取和操作自己的通知。

## 后台接口

后台接口统一前缀为 `/admin`，全部需要管理员 token。

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/users` | 分页查询用户 |
| PATCH | `/admin/users/:id/disable` | 禁用用户 |
| PATCH | `/admin/users/:id/enable` | 恢复用户 |

### 内容管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/contents` | 分页查询全部状态内容 |
| PATCH | `/admin/contents/:id/approve` | 审核通过待审核内容 |
| PATCH | `/admin/contents/:id/reject` | 驳回待审核内容 |
| PATCH | `/admin/contents/:id/offline` | 下架内容 |
| DELETE | `/admin/contents/:id` | 删除内容 |

驳回内容请求示例：

```json
{
  "reason": "内容不符合发布规范"
}
```

### 评论管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/comments` | 分页查询评论 |
| DELETE | `/admin/comments/:id` | 删除违规评论 |

### 标签管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/tags` | 分页查询全部标签，可按状态过滤 |
| POST | `/admin/tags` | 新增标签 |
| PATCH | `/admin/tags/:id` | 修改标签名称 |
| PATCH | `/admin/tags/:id/enable` | 启用标签 |
| PATCH | `/admin/tags/:id/disable` | 禁用标签 |

新增或修改标签请求示例：

```json
{
  "name": "Node.js"
}
```

### 文件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/files` | 分页查询上传文件 |
| DELETE | `/admin/files/:id` | 删除违规文件 |

文件删除后，数据库状态会变为 `deleted`，旧文件 URL 不再可访问；如果该文件被用作用户头像，头像引用会被清空。

## 分页和排序

列表接口支持分页参数：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `page` | `1` | 页码 |
| `pageSize` | `10` | 每页数量 |

公开内容、评论和后台列表默认按创建时间倒序返回。

## 业务约束

- 本期只区分普通用户和管理员两类角色。
- 用户端写操作和全部后台接口必须校验 token。
- 被禁用用户不能登录，也不能访问需要登录的接口。
- 用户发布内容时只能选择启用标签。
- 禁用标签不影响历史内容展示，但不能被新内容选择。
- 内容正文和图片不能同时为空。
- 评论和回复只能关联已公开且未删除内容。
- 头像文件和内容图片文件必须归属当前用户，且用途必须匹配。
- 已删除文件不能继续作为头像或内容图片展示。
