> 来源: spec.md
> 生成时间: 2026-07-06
> 阶段: design

### Why

**背景与现状**

当前 coderhub 是 Node.js + Koa + MySQL 后端项目，已有 `src/main.js` 服务启动入口、`src/app/index.js` Koa 应用组装入口、`src/app/database.js` MySQL 连接池、`src/config/server.js` 环境变量配置，以及用户模块的 router/controller/service 基础结构。现有接口只覆盖 `POST /users` 注册雏形和 `GET /users/list` 示例路由，尚未形成统一认证、错误处理、业务模块划分、文件上传、后台管理和数据库迁移设计。

本次设计基于 `changes/active/core-systems/spec.md`，覆盖用户、内容、评论、标签、文件、后台管理六类核心系统。设计目标是保持 Koa 项目现有分层风格，采用“router → middleware → controller → service → database”的最简可行结构，让后续 coding 阶段可以按模块渐进实现。

**设计目标 / 非目标**

| 类型 | 说明 |
|------|------|
| ✅ 目标 | 建立统一 API 响应、错误处理、认证鉴权和分页参数规范 |
| ✅ 目标 | 扩展用户注册、登录、当前用户信息、资料维护、后台用户管理能力 |
| ✅ 目标 | 新增内容发布、审核、公开查询、编辑、删除和后台治理能力 |
| ✅ 目标 | 新增评论、回复、删除和后台评论管理能力 |
| ✅ 目标 | 新增标签查询、内容标签关联和后台标签维护能力 |
| ✅ 目标 | 新增头像图片、内容图片上传和后台文件管理能力 |
| ✅ 目标 | 明确 MySQL 表结构、业务状态枚举、接口契约和模块职责 |
| ❌ 非目标 | 不实现私信、关注、点赞、收藏、消息通知 |
| ❌ 非目标 | 不实现内容推荐、热榜排序、全文搜索 |
| ❌ 非目标 | 不支持视频、音频、压缩包等非图片文件上传 |
| ❌ 非目标 | 不实现第三方登录、短信登录、邮箱验证、找回密码 |
| ❌ 非目标 | 不实现多级组织和细粒度 RBAC；本期只区分普通用户和管理员 |
| ❌ 非目标 | 不允许用户端自助创建标签 |

### What

#### 技术方案

**架构决策**

| 模块 | 职责 | 依赖 |
|------|------|------|
| `src/app/index.js` | 组装 Koa 实例、body parser、静态文件、统一错误处理、业务路由 | routers、error middleware |
| `src/app/database.js` | 维护 MySQL 连接池 | `mysql2/promise`、`src/config/server.js` |
| `src/config/server.js` | 读取并导出服务、数据库、JWT、文件上传配置 | `dotenv` |
| `src/constants/*.js` | 统一维护业务状态、错误码、文件类型等常量 | 无 |
| `src/utils/response.js` | 统一成功响应和分页响应结构 | 无 |
| `src/utils/password.js` | 密码加密和密码比对方法签名 | `bcryptjs` |
| `src/utils/token.js` | token 签发和校验方法签名 | `jsonwebtoken` |
| `src/middleware/error_middleware.js` | 捕获业务错误和未知错误，转换为统一响应 | constants |
| `src/middleware/auth_middleware.js` | 校验 token、注入当前用户、限制禁用用户、限制管理员接口 | user service、token utils |
| `src/middleware/upload_middleware.js` | 校验图片上传类型、大小和场景 | `@koa/multer` |
| `src/router/*_router.js` | 声明 REST API 路由与中间件链 | controller、middleware |
| `src/controller/*_controller.js` | 读取 ctx 入参，调用 service，输出统一响应 | service、response utils |
| `src/service/*_service.js` | 封装业务校验与数据库访问 | database、constants |
| `database/schema.sql` | 建库建表脚本，承载本期数据模型 | MySQL |

模块关系：

```text
HTTP Request
  → Koa app
  → error middleware
  → router
  → auth/upload middleware
  → controller
  → service
  → database connection pool
  → MySQL
```

**数据模型变更**

| 操作 | 表/实体 | 字段 | 类型 | 约束 | 说明 |
|------|---------|------|------|------|------|
| 新增/修改 | `user` | `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 用户主键 |
| 新增/修改 | `user` | `name` | VARCHAR(30) | NOT NULL, UNIQUE | 登录用户名 |
| 新增/修改 | `user` | `password` | VARCHAR(100) | NOT NULL | 加密后的密码 |
| 新增/修改 | `user` | `nickname` | VARCHAR(30) | NULL | 用户昵称 |
| 新增/修改 | `user` | `avatar_file_id` | BIGINT UNSIGNED | NULL, FK `file.id` | 用户头像文件 |
| 新增/修改 | `user` | `intro` | VARCHAR(200) | NULL | 个人简介 |
| 新增/修改 | `user` | `role` | VARCHAR(20) | NOT NULL, DEFAULT `user` | `user` / `admin` |
| 新增/修改 | `user` | `status` | VARCHAR(20) | NOT NULL, DEFAULT `active` | `active` / `disabled` |
| 新增/修改 | `user` | `created_at` | DATETIME | NOT NULL | 创建时间 |
| 新增/修改 | `user` | `updated_at` | DATETIME | NOT NULL | 更新时间 |
| 新增 | `content` | `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 内容主键 |
| 新增 | `content` | `user_id` | BIGINT UNSIGNED | NOT NULL, FK `user.id` | 作者 |
| 新增 | `content` | `body` | TEXT | NULL | 动态正文 |
| 新增 | `content` | `status` | VARCHAR(20) | NOT NULL, DEFAULT `pending` | `pending` / `published` / `rejected` / `offline` / `deleted` |
| 新增 | `content` | `reject_reason` | VARCHAR(200) | NULL | 审核驳回原因 |
| 新增 | `content` | `reviewer_id` | BIGINT UNSIGNED | NULL, FK `user.id` | 审核管理员 |
| 新增 | `content` | `reviewed_at` | DATETIME | NULL | 审核时间 |
| 新增 | `content` | `created_at` | DATETIME | NOT NULL | 创建时间 |
| 新增 | `content` | `updated_at` | DATETIME | NOT NULL | 更新时间 |
| 新增 | `content_file` | `content_id` | BIGINT UNSIGNED | NOT NULL, FK `content.id` | 内容 |
| 新增 | `content_file` | `file_id` | BIGINT UNSIGNED | NOT NULL, FK `file.id` | 内容图片 |
| 新增 | `comment` | `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 评论主键 |
| 新增 | `comment` | `content_id` | BIGINT UNSIGNED | NOT NULL, FK `content.id` | 所属内容 |
| 新增 | `comment` | `user_id` | BIGINT UNSIGNED | NOT NULL, FK `user.id` | 评论作者 |
| 新增 | `comment` | `parent_id` | BIGINT UNSIGNED | NULL, FK `comment.id` | 父评论，NULL 表示一级评论 |
| 新增 | `comment` | `body` | VARCHAR(500) | NOT NULL | 评论内容 |
| 新增 | `comment` | `status` | VARCHAR(20) | NOT NULL, DEFAULT `visible` | `visible` / `deleted` |
| 新增 | `comment` | `created_at` | DATETIME | NOT NULL | 创建时间 |
| 新增 | `comment` | `updated_at` | DATETIME | NOT NULL | 更新时间 |
| 新增 | `tag` | `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 标签主键 |
| 新增 | `tag` | `name` | VARCHAR(30) | NOT NULL, UNIQUE | 标签名称 |
| 新增 | `tag` | `status` | VARCHAR(20) | NOT NULL, DEFAULT `enabled` | `enabled` / `disabled` |
| 新增 | `tag` | `created_at` | DATETIME | NOT NULL | 创建时间 |
| 新增 | `tag` | `updated_at` | DATETIME | NOT NULL | 更新时间 |
| 新增 | `content_tag` | `content_id` | BIGINT UNSIGNED | NOT NULL, FK `content.id` | 内容 |
| 新增 | `content_tag` | `tag_id` | BIGINT UNSIGNED | NOT NULL, FK `tag.id` | 标签 |
| 新增 | `file` | `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 文件主键 |
| 新增 | `file` | `user_id` | BIGINT UNSIGNED | NOT NULL, FK `user.id` | 上传用户 |
| 新增 | `file` | `usage_type` | VARCHAR(20) | NOT NULL | `avatar` / `content_image` |
| 新增 | `file` | `filename` | VARCHAR(255) | NOT NULL | 服务端文件名 |
| 新增 | `file` | `original_name` | VARCHAR(255) | NOT NULL | 原始文件名 |
| 新增 | `file` | `mime_type` | VARCHAR(100) | NOT NULL | MIME 类型 |
| 新增 | `file` | `size` | BIGINT UNSIGNED | NOT NULL | 文件大小 |
| 新增 | `file` | `url` | VARCHAR(500) | NOT NULL | 文件访问 URL |
| 新增 | `file` | `status` | VARCHAR(20) | NOT NULL, DEFAULT `active` | `active` / `deleted` |
| 新增 | `file` | `created_at` | DATETIME | NOT NULL | 创建时间 |
| 新增 | `file` | `updated_at` | DATETIME | NOT NULL | 更新时间 |

实体关系：

- `user` 1:N `content`
- `user` 1:N `comment`
- `user` 1:N `file`
- `content` 1:N `comment`
- `comment` 1:N `comment`（回复关系）
- `content` N:M `tag`，通过 `content_tag` 关联
- `content` N:M `file`，通过 `content_file` 关联内容图片
- `user.avatar_file_id` N:1 `file`

建议索引：

| 表 | 索引 | 说明 |
|----|------|------|
| `user` | UNIQUE (`name`) | 支持注册去重和登录查询 |
| `user` | INDEX (`role`, `status`) | 支持后台用户筛选 |
| `content` | INDEX (`status`, `created_at`) | 支持公开列表和后台列表 |
| `content` | INDEX (`user_id`, `status`) | 支持作者内容列表 |
| `comment` | INDEX (`content_id`, `status`, `created_at`) | 支持内容评论列表 |
| `comment` | INDEX (`parent_id`, `status`) | 支持评论回复查询 |
| `tag` | UNIQUE (`name`) | 支持重名校验 |
| `tag` | INDEX (`status`) | 支持启用标签查询 |
| `file` | INDEX (`user_id`, `usage_type`, `status`) | 支持用户文件和后台文件管理 |

**接口定义**

统一响应结构：

| 类型 | 结构 | 说明 |
|------|------|------|
| 成功响应 | `{ code: 0, message: string, data: object | array | null }` | 非分页接口 |
| 分页响应 | `{ code: 0, message: string, data: { list: array, total: number, page: number, pageSize: number } }` | 列表接口 |
| 错误响应 | `{ code: number, message: string }` | 失败接口 |

用户端接口：

| 接口 | 方法 | 路径/签名 | 入参 | 出参 | 异常 |
|------|------|----------|------|------|------|
| 注册用户 | POST | `/users` | body: `{ name: string, password: string }` | `{ id: number, name: string }` | 400 参数错误；409 用户名重复；500 服务端错误 |
| 用户登录 | POST | `/login` | body: `{ name: string, password: string }` | `{ token: string, user: UserProfile }` | 400 参数错误；401 认证失败；403 账号禁用 |
| 当前用户信息 | GET | `/users/me` | header: `Authorization: Bearer <token>` | `UserProfile` | 401 未认证；403 账号禁用 |
| 修改个人资料 | PATCH | `/users/me` | body: `{ nickname?: string, avatarFileId?: number, intro?: string }` | `UserProfile` | 400 参数错误；401 未认证；403 账号禁用；404 文件不存在 |
| 启用标签列表 | GET | `/tags` | query: `{ page?: number, pageSize?: number }` | 分页 `TagItem[]` | 400 参数错误 |
| 发布内容 | POST | `/contents` | body: `{ body?: string, tagIds?: number[], fileIds?: number[] }` | `{ id: number, status: 'pending' }` | 400 参数错误；401 未认证；403 账号禁用；404 标签或文件不存在 |
| 公开内容列表 | GET | `/contents` | query: `{ page?: number, pageSize?: number, tagId?: number }` | 分页 `ContentListItem[]` | 400 参数错误 |
| 内容详情 | GET | `/contents/:id` | path: `{ id: number }` | `ContentDetail` | 404 内容不存在 |
| 我的内容列表 | GET | `/users/me/contents` | query: `{ page?: number, pageSize?: number, status?: string }` | 分页 `ContentListItem[]` | 401 未认证；403 账号禁用 |
| 编辑我的内容 | PATCH | `/contents/:id` | body: `{ body?: string, tagIds?: number[], fileIds?: number[] }` | `ContentDetail` | 400 参数错误；401 未认证；403 无权限或账号禁用；404 内容不存在；409 状态不允许 |
| 删除我的内容 | DELETE | `/contents/:id` | path: `{ id: number }` | `{ id: number }` | 401 未认证；403 无权限或账号禁用；404 内容不存在 |
| 评论内容 | POST | `/contents/:id/comments` | body: `{ body: string }` | `CommentItem` | 400 参数错误；401 未认证；403 账号禁用；404 内容不存在或未公开 |
| 回复评论 | POST | `/comments/:id/replies` | body: `{ body: string }` | `CommentItem` | 400 参数错误；401 未认证；403 账号禁用；404 评论不存在或已删除 |
| 评论列表 | GET | `/contents/:id/comments` | query: `{ page?: number, pageSize?: number }` | 分页 `CommentItem[]` | 400 参数错误；404 内容不存在或未公开 |
| 删除评论 | DELETE | `/comments/:id` | path: `{ id: number }` | `{ id: number }` | 401 未认证；403 无权限或账号禁用；404 评论不存在 |
| 上传头像图片 | POST | `/files/avatar` | multipart: `file` | `FileItem` | 400 文件错误；401 未认证；403 账号禁用；413 文件过大 |
| 上传内容图片 | POST | `/files/content-images` | multipart: `file` | `FileItem` | 400 文件错误；401 未认证；403 账号禁用；413 文件过大 |

后台接口：

| 接口 | 方法 | 路径/签名 | 入参 | 出参 | 异常 |
|------|------|----------|------|------|------|
| 后台用户列表 | GET | `/admin/users` | query: `{ page?: number, pageSize?: number, status?: string }` | 分页 `AdminUserItem[]` | 401 未认证；403 无权限 |
| 禁用用户 | PATCH | `/admin/users/:id/disable` | path: `{ id: number }` | `{ id: number, status: 'disabled' }` | 401 未认证；403 无权限；404 用户不存在 |
| 恢复用户 | PATCH | `/admin/users/:id/enable` | path: `{ id: number }` | `{ id: number, status: 'active' }` | 401 未认证；403 无权限；404 用户不存在 |
| 后台内容列表 | GET | `/admin/contents` | query: `{ page?: number, pageSize?: number, status?: string }` | 分页 `AdminContentItem[]` | 401 未认证；403 无权限 |
| 审核通过内容 | PATCH | `/admin/contents/:id/approve` | path: `{ id: number }` | `{ id: number, status: 'published' }` | 401 未认证；403 无权限；404 内容不存在；409 状态不允许 |
| 驳回内容 | PATCH | `/admin/contents/:id/reject` | body: `{ reason: string }` | `{ id: number, status: 'rejected' }` | 400 参数错误；401 未认证；403 无权限；404 内容不存在；409 状态不允许 |
| 下架内容 | PATCH | `/admin/contents/:id/offline` | path: `{ id: number }` | `{ id: number, status: 'offline' }` | 401 未认证；403 无权限；404 内容不存在 |
| 删除内容 | DELETE | `/admin/contents/:id` | path: `{ id: number }` | `{ id: number, status: 'deleted' }` | 401 未认证；403 无权限；404 内容不存在 |
| 后台评论列表 | GET | `/admin/comments` | query: `{ page?: number, pageSize?: number, contentId?: number }` | 分页 `AdminCommentItem[]` | 401 未认证；403 无权限 |
| 删除违规评论 | DELETE | `/admin/comments/:id` | path: `{ id: number }` | `{ id: number, status: 'deleted' }` | 401 未认证；403 无权限；404 评论不存在 |
| 新增标签 | POST | `/admin/tags` | body: `{ name: string }` | `TagItem` | 400 参数错误；401 未认证；403 无权限；409 标签重名 |
| 修改标签 | PATCH | `/admin/tags/:id` | body: `{ name?: string }` | `TagItem` | 400 参数错误；401 未认证；403 无权限；404 标签不存在；409 标签重名 |
| 启用标签 | PATCH | `/admin/tags/:id/enable` | path: `{ id: number }` | `{ id: number, status: 'enabled' }` | 401 未认证；403 无权限；404 标签不存在 |
| 禁用标签 | PATCH | `/admin/tags/:id/disable` | path: `{ id: number }` | `{ id: number, status: 'disabled' }` | 401 未认证；403 无权限；404 标签不存在 |
| 后台文件列表 | GET | `/admin/files` | query: `{ page?: number, pageSize?: number, usageType?: string }` | 分页 `FileItem[]` | 401 未认证；403 无权限 |
| 删除文件 | DELETE | `/admin/files/:id` | path: `{ id: number }` | `{ id: number, status: 'deleted' }` | 401 未认证；403 无权限；404 文件不存在 |

内部关键方法签名：

| 模块 | 方法签名 | 入参 | 出参 | 异常 |
|------|----------|------|------|------|
| `UserService` | `async findByName(name)` | `name: string` | `UserRecord[]` | 数据库错误 |
| `UserService` | `async create(user)` | `{ name: string, password: string }` | `CreateResult` | 数据库错误 |
| `UserService` | `async login(credentials)` | `{ name: string, password: string }` | `{ token: string, user: UserProfile }` | 401 / 403 |
| `UserService` | `async findById(id)` | `id: number` | `UserRecord | null` | 数据库错误 |
| `UserService` | `async updateProfile(userId, profile)` | `userId: number, profile: UserProfilePatch` | `UserProfile` | 400 / 404 |
| `UserService` | `async listUsers(query)` | `AdminUserQuery` | `PageResult<AdminUserItem>` | 数据库错误 |
| `UserService` | `async updateStatus(userId, status)` | `userId: number, status: 'active' | 'disabled'` | `AdminUserItem` | 404 |
| `ContentService` | `async createContent(userId, payload)` | `userId: number, payload: CreateContentPayload` | `ContentDetail` | 400 / 404 |
| `ContentService` | `async listPublished(query)` | `ContentListQuery` | `PageResult<ContentListItem>` | 数据库错误 |
| `ContentService` | `async getPublishedDetail(contentId)` | `contentId: number` | `ContentDetail` | 404 |
| `ContentService` | `async listMine(userId, query)` | `userId: number, query: MyContentQuery` | `PageResult<ContentListItem>` | 数据库错误 |
| `ContentService` | `async updateMine(userId, contentId, payload)` | `userId: number, contentId: number, payload: UpdateContentPayload` | `ContentDetail` | 403 / 404 / 409 |
| `ContentService` | `async deleteMine(userId, contentId)` | `userId: number, contentId: number` | `{ id: number }` | 403 / 404 |
| `ContentService` | `async listAdmin(query)` | `AdminContentQuery` | `PageResult<AdminContentItem>` | 数据库错误 |
| `ContentService` | `async approve(contentId, reviewerId)` | `contentId: number, reviewerId: number` | `AdminContentItem` | 404 / 409 |
| `ContentService` | `async reject(contentId, reviewerId, reason)` | `contentId: number, reviewerId: number, reason: string` | `AdminContentItem` | 400 / 404 / 409 |
| `ContentService` | `async offline(contentId)` | `contentId: number` | `AdminContentItem` | 404 |
| `ContentService` | `async deleteByAdmin(contentId)` | `contentId: number` | `AdminContentItem` | 404 |
| `CommentService` | `async createComment(userId, contentId, body)` | `userId: number, contentId: number, body: string` | `CommentItem` | 400 / 404 |
| `CommentService` | `async createReply(userId, parentCommentId, body)` | `userId: number, parentCommentId: number, body: string` | `CommentItem` | 400 / 404 |
| `CommentService` | `async listByContent(contentId, query)` | `contentId: number, query: PageQuery` | `PageResult<CommentItem>` | 404 |
| `CommentService` | `async deleteByUser(userId, commentId)` | `userId: number, commentId: number` | `{ id: number }` | 403 / 404 |
| `CommentService` | `async listAdmin(query)` | `AdminCommentQuery` | `PageResult<AdminCommentItem>` | 数据库错误 |
| `CommentService` | `async deleteByAdmin(commentId)` | `commentId: number` | `AdminCommentItem` | 404 |
| `TagService` | `async listEnabled(query)` | `PageQuery` | `PageResult<TagItem>` | 数据库错误 |
| `TagService` | `async createTag(payload)` | `{ name: string }` | `TagItem` | 400 / 409 |
| `TagService` | `async updateTag(tagId, payload)` | `tagId: number, payload: { name?: string }` | `TagItem` | 400 / 404 / 409 |
| `TagService` | `async updateStatus(tagId, status)` | `tagId: number, status: 'enabled' | 'disabled'` | `TagItem` | 404 |
| `TagService` | `async assertEnabledTags(tagIds)` | `tagIds: number[]` | `TagItem[]` | 400 / 404 |
| `FileService` | `async createFile(userId, usageType, file)` | `userId: number, usageType: string, file: UploadedFile` | `FileItem` | 400 |
| `FileService` | `async findActiveById(fileId)` | `fileId: number` | `FileItem | null` | 数据库错误 |
| `FileService` | `async listAdmin(query)` | `AdminFileQuery` | `PageResult<FileItem>` | 数据库错误 |
| `FileService` | `async deleteByAdmin(fileId)` | `fileId: number` | `FileItem` | 404 |
| `auth_middleware` | `verifyAuth(ctx, next)` | Koa ctx,next | `Promise<void>` | 401 / 403 |
| `auth_middleware` | `verifyAdmin(ctx, next)` | Koa ctx,next | `Promise<void>` | 401 / 403 |
| `upload_middleware` | `imageUploader(fieldName, usageType)` | `fieldName: string, usageType: string` | Koa middleware | 400 / 413 |

**错误处理策略**

| 错误类型 | 处理方式 | HTTP状态码/异常类 |
|---------|---------|----------------|
| 参数缺失或格式错误 | controller 或 service 抛出业务错误，统一错误中间件响应 | 400 / `PARAMS_ERROR` |
| 用户名或标签重名 | service 在写入前查询或依赖唯一索引捕获冲突 | 409 / `CONFLICT` |
| 登录认证失败 | 统一返回认证失败，不暴露用户名是否存在 | 401 / `AUTH_FAILED` |
| 未携带 token | auth middleware 拦截 | 401 / `UNAUTHORIZED` |
| token 无效或过期 | auth middleware 拦截 | 401 / `UNAUTHORIZED` |
| 账号禁用 | auth middleware 或 login service 拦截 | 403 / `USER_DISABLED` |
| 普通用户访问后台 | admin middleware 拦截 | 403 / `FORBIDDEN` |
| 操作他人资源 | service 校验 owner 后拒绝 | 403 / `FORBIDDEN` |
| 资源不存在 | service 查询为空时抛出 | 404 / `NOT_FOUND` |
| 状态不允许 | service 校验状态机失败时抛出 | 409 / `INVALID_STATUS` |
| 上传非图片 | upload middleware 校验 MIME 类型 | 400 / `INVALID_FILE_TYPE` |
| 上传文件过大 | upload middleware 校验 size | 413 / `FILE_TOO_LARGE` |
| 数据库异常 | error middleware 记录服务端错误并返回通用响应 | 500 / `INTERNAL_ERROR` |

#### 关键决策与理由

| 决策 | 可选方案 | 选择 | 理由 |
|------|---------|------|------|
| 后端分层 | A: router/controller/service 分层 / B: controller 直接写 SQL | A | 现有代码已有 user router/controller/service/service 访问数据库的雏形，继续复用可降低改动成本，也便于测试业务层 |
| 认证方式 | A: JWT token / B: session | A | spec 已确认 Token 登录；项目是纯 API 服务，没有 session 存储基础；JWT 依赖少、适合前后端分离接口 |
| 密码处理 | A: 明文存储 / B: bcrypt 哈希存储 | B | 登录功能涉及密码，必须避免明文；bcryptjs 在 Node 项目中使用简单，满足最简安全基线 |
| 管理员权限 | A: 独立权限表 / B: user.role 字段 | B | spec 只要求普通用户和管理员，不需要细粒度 RBAC；role 字段是最简可行方案 |
| 内容审核状态 | A: 单独审核表 / B: content.status + 审核字段 | B | 本期只需要当前审核结果和原因，不需要完整审核流水；单表字段满足 spec |
| 删除策略 | A: 物理删除 / B: 状态软删除 | B | spec 要求删除后不展示且后台治理可追踪；软删除可避免评论、文件、内容关系丢失 |
| 评论回复模型 | A: 无限层级树 / B: parent_id 支持一级父评论 | B | spec 只要求“评论 + 回复”，不要求无限嵌套；parent_id 可满足回复且实现简单 |
| 标签维护 | A: 用户可创建标签 / B: 后台维护标签 | B | spec 已确认后台维护，避免用户端创建标签导致治理成本上升 |
| 文件存储 | A: 本地 uploads 目录 / B: 云对象存储 | A | spec 未要求外部对象存储；本地存储依赖少、适合当前学习型 Koa 项目第一版 |
| 文件访问 | A: Koa 静态资源暴露 `/uploads` / B: 每次通过接口读取文件 | A | 图片文件需要被头像和内容图片直接展示，静态资源最简单 |
| 数据库脚本 | A: 只写代码不写 schema / B: 新增 `database/schema.sql` | B | 当前仓库没有迁移工具；schema.sql 明确数据模型，便于本地初始化和验收 |
| API 响应 | A: 各 controller 自由返回 / B: 统一 code/message/data | B | 现有注册接口已返回 code/message/data；统一格式便于联调和测试 |

#### 风险与权衡

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 一次性覆盖六个核心系统，接口数量较多 | 中 | 高 | 按数据模型、公共能力、用户、标签、文件、内容、评论、后台、联调顺序实施；每个任务控制在 0.5~2 人天 |
| 引入 JWT、bcrypt、multer 新依赖后安装或版本兼容失败 | 中 | 中 | 在编码阶段先安装并验证最小示例，再接入业务模块 |
| 本地文件存储不适合未来生产扩展 | 中 | 中 | 本期只满足头像和内容图片；通过 `FileService` 封装，后续可替换为对象存储 |
| 内容、标签、文件多表关联导致状态不一致 | 中 | 高 | 内容创建、内容更新、文件关联、标签关联使用事务边界设计 |
| 缺少现成测试框架 | 高 | 中 | 编码阶段先补充测试脚本和接口级验证方案，再逐模块验证 |

**发布策略**：

- **发布方式**：本地一次性开发完成后整体验收；不做灰度发布。
- **回滚条件**：核心接口无法启动、数据库脚本无法执行、注册登录基础链路失败时回滚本次功能代码。
- **数据迁移**：当前项目未发现生产数据迁移脚本；本期新增 `database/schema.sql`，编码前先确认本地数据库初始化方式。

#### 变更文件清单

| 文件路径 | 操作 | 变更说明 |
|---------|------|---------|
| `package.json` | 修改 | 新增认证、密码、上传、静态资源、测试相关依赖和脚本 |
| `.env.example` | 新增 | 声明 SERVER、MYSQL、JWT、UPLOAD 配置示例 |
| `database/schema.sql` | 新增 | 定义 user、content、comment、tag、file 及关联表 |
| `src/config/server.js` | 修改 | 导出 JWT、上传目录、文件大小等配置 |
| `src/app/index.js` | 修改 | 注册错误中间件、静态资源、全部业务路由 |
| `src/constants/error_codes.js` | 新增 | 统一错误码 |
| `src/constants/status.js` | 新增 | 统一用户、内容、评论、标签、文件状态 |
| `src/utils/response.js` | 新增 | 统一成功和分页响应方法 |
| `src/utils/password.js` | 新增 | 密码加密与比对方法 |
| `src/utils/token.js` | 新增 | token 签发与校验方法 |
| `src/middleware/error_middleware.js` | 新增 | 统一错误处理 |
| `src/middleware/auth_middleware.js` | 新增 | 登录校验、账号状态校验、管理员校验 |
| `src/middleware/upload_middleware.js` | 新增 | 图片上传校验与处理 |
| `src/router/user_router.js` | 修改 | 扩展用户注册、登录、当前用户、资料维护路由 |
| `src/controller/user_controller.js` | 修改 | 扩展用户 controller 方法 |
| `src/service/user_service.js` | 修改 | 扩展用户 service 方法 |
| `src/router/content_router.js` | 新增 | 内容用户端路由 |
| `src/controller/content_controller.js` | 新增 | 内容用户端 controller |
| `src/service/content_service.js` | 新增 | 内容业务和数据访问 |
| `src/router/comment_router.js` | 新增 | 评论路由 |
| `src/controller/comment_controller.js` | 新增 | 评论 controller |
| `src/service/comment_service.js` | 新增 | 评论业务和数据访问 |
| `src/router/tag_router.js` | 新增 | 用户端标签查询路由 |
| `src/controller/tag_controller.js` | 新增 | 标签 controller |
| `src/service/tag_service.js` | 新增 | 标签业务和数据访问 |
| `src/router/file_router.js` | 新增 | 文件上传路由 |
| `src/controller/file_controller.js` | 新增 | 文件 controller |
| `src/service/file_service.js` | 新增 | 文件业务和数据访问 |
| `src/router/admin_router.js` | 新增 | 后台管理聚合路由 |
| `src/controller/admin_controller.js` | 新增 | 后台管理 controller |
| `test/core-systems.test.js` | 新增 | 核心系统接口测试或集成验证入口 |

### How

#### 任务拆分

| 任务名称 | 详细描述 | 关联设计章节 | 计划工作量(人天) |
|----------|---------|------------|--------------|
| 【数据模型】(后端) 建立核心系统数据库结构 | 1. 新增 `database/schema.sql`<br>2. 定义用户、内容、评论、标签、文件和关联表<br>3. 定义唯一索引、普通索引、外键和状态字段<br>4. 验证本地 MySQL 可执行建表脚本 | 数据模型变更 | 1.5 |
| 【公共能力】(后端) 建立统一响应、错误和配置基础 | 1. 扩展 `src/config/server.js` 配置项<br>2. 新增错误码、业务状态常量<br>3. 新增统一响应工具<br>4. 新增统一错误处理中间件<br>5. 在 `src/app/index.js` 注册公共能力 | 架构决策、错误处理策略 | 1 |
| 【认证】(后端) 实现密码与 token 认证基础 | 1. 新增密码加密与比对工具<br>2. 新增 token 签发与校验工具<br>3. 新增登录校验、账号禁用校验、管理员校验中间件<br>4. 覆盖无 token、无效 token、账号禁用、普通用户访问后台失败路径 | 接口定义、关键决策与理由 | 1.5 |
| 【用户】(后端) 完善注册、登录和用户资料接口 | 1. 扩展用户路由、controller、service<br>2. 支持注册、登录、当前用户信息、资料维护<br>3. 支持后台用户分页、禁用、恢复<br>4. 覆盖重复用户名、密码错误、禁用用户、头像文件不存在失败路径 | 接口定义、数据模型变更 | 2 |
| 【标签】(后端) 实现标签查询和后台维护 | 1. 新增标签路由、controller、service<br>2. 支持用户端启用标签分页查询<br>3. 支持后台新增、修改、启用、禁用标签<br>4. 覆盖重名、标签不存在、禁用标签选择失败路径 | 接口定义、数据模型变更 | 1 |
| 【文件】(后端) 实现头像和内容图片上传管理 | 1. 新增上传中间件、文件路由、controller、service<br>2. 支持头像图片和内容图片上传<br>3. 支持后台文件分页和删除<br>4. 支持 `/uploads` 文件访问<br>5. 覆盖非图片、文件过大、已删除文件引用失败路径 | 接口定义、关键决策与理由 | 1.5 |
| 【内容】(后端) 实现动态发布、审核、公开查询和作者操作 | 1. 新增内容路由、controller、service<br>2. 支持发布待审核内容、公开列表、公开详情、我的内容列表<br>3. 支持作者编辑待审核或已驳回内容、作者删除内容<br>4. 支持后台审核通过、驳回、下架、删除内容<br>5. 覆盖状态不允许、无权限、内容不可见、标签或文件无效失败路径 | 接口定义、数据模型变更、错误处理策略 | 2 |
| 【评论】(后端) 实现评论、回复和删除 | 1. 新增评论路由、controller、service<br>2. 支持对公开内容发表评论和回复评论<br>3. 支持评论列表分页<br>4. 支持评论作者、内容作者、管理员删除评论<br>5. 覆盖未公开内容、已删除评论、无权限删除失败路径 | 接口定义、数据模型变更 | 1.5 |
| 【后台聚合】(后端) 整合后台管理入口 | 1. 新增后台聚合路由和 controller<br>2. 统一挂载用户、内容、评论、标签、文件后台接口<br>3. 确保所有后台接口使用管理员中间件<br>4. 验证普通用户访问后台均返回无权限 | 架构决策、接口定义 | 1 |
| 【测试验证】联调 + 功能测试 | 1. 补充测试或接口验证脚本<br>2. 验证注册、登录、上传、发布、审核、公开查询、评论完整链路<br>3. 验证后台禁用用户、删除评论、删除文件、下架内容链路<br>4. 验证 spec 中失败路径和边界条件<br>5. 输出测试结果 | 风险与权衡、接口定义 | 1 |
| **合计** | | | **14** |

**任务排序原则**：先数据模型 → 公共能力 → 认证 → 用户 → 标签/文件 → 内容 → 评论 → 后台聚合 → 联调测试。

**任务依赖**：

```text
- 【数据模型】
- 【公共能力】 ← depends: 【数据模型】
- 【认证】 ← depends: 【公共能力】
- 【用户】 ← depends: 【认证】
- 【标签】 ← depends: 【认证】
- 【文件】 ← depends: 【认证】
- 【内容】 ← depends: 【用户】, 【标签】, 【文件】
- 【评论】 ← depends: 【内容】
- 【后台聚合】 ← depends: 【用户】, 【标签】, 【文件】, 【内容】, 【评论】
- 【测试验证】 ← depends: 全部功能任务
```

### Verify

```text
设计自检：
- [x] 所有 spec 功能需求都有对应的技术方案
- [x] 所有技术决策都有理由
- [x] 接口定义完整（入参、出参、异常）
- [x] 数据模型变更明确（新增/修改/删除）
- [x] 任务拆分覆盖全部设计内容
- [x] 任务总量与需求规模匹配
- [x] 无实现代码（只有签名和结构）
- [x] 已按 .best-practices/ 约束检查 Risks/Rollout
```

### Impact

- 用户模块：扩展现有 `user_router`、`user_controller`、`user_service`，覆盖注册、登录、资料、后台用户管理。
- 应用入口：`src/app/index.js` 从单用户路由扩展为多业务路由注册，并加入错误处理、静态资源能力。
- 配置模块：`src/config/server.js` 新增 JWT、上传相关配置。
- 新增模块：内容、评论、标签、文件、后台管理相关 router/controller/service。
- 数据库变更：是，新增或扩展 7 张核心表及索引关系。
- 外部依赖变更：是，建议新增 `jsonwebtoken`、`bcryptjs`、`@koa/multer`、`koa-static`；测试阶段按编码需求补充测试依赖。
