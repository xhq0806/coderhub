# SYSTEM-SPEC

> 本文件记录当前系统已归档的行为规格。由需求归档流程维护。

## coderhub 核心系统

coderhub 是面向程序员的生活动态分享平台，包含 Node.js + Koa + MySQL 后端服务，以及 React + Vite + TypeScript 前端应用。系统支持普通用户注册登录、内容发布审核、评论回复、标签维护、图片上传、个人资料维护和后台管理。

## 用户端前端

普通用户端提供公开动态浏览、注册登录、图片上传、发布动态、我的内容、评论回复和个人资料维护。用户端复用后端 `{ code, message, data }` 响应结构，登录态使用 token 并在受保护接口中携带 `Authorization: Bearer <token>`。

## 管理端前端

### 功能说明

管理端前端在现有 `web/` React + Vite + TypeScript 工程中提供 `/admin` 路由组，让管理员通过页面完成平台治理，不再依赖接口工具。

### 角色与入口

- 只有 `role = admin` 的登录用户可以进入 `/admin` 路由组。
- 未登录访问管理端时跳转登录页，登录成功后返回原管理端入口。
- 普通用户访问管理端时显示无权限页面，不进入后台列表页。
- 管理端复用用户端登录态和 `request` 封装。

### 页面范围

| 路由 | 能力 |
|------|------|
| `/admin` | 后台总览，展示用户、内容、评论、标签、文件五类治理入口和关键数量摘要 |
| `/admin/users` | 用户分页、状态筛选、禁用 active 用户、恢复 disabled 用户 |
| `/admin/contents` | 内容分页、状态筛选、审核通过 pending 内容、驳回 pending 内容、下架 published 内容、删除内容 |
| `/admin/comments` | 评论分页、按内容 ID 过滤、删除违规评论 |
| `/admin/tags` | 标签分页、状态筛选、新增、改名、启用、禁用 |
| `/admin/files` | 文件分页、用途筛选、图片预览、删除 active 文件 |

### 统一反馈

- 管理端列表统一覆盖 loading、empty、error、分页和重试状态。
- 治理操作成功后展示成功反馈，并刷新当前列表。
- 治理操作失败时展示后端错误信息。
- 后台接口返回 `-1006` 时显示明确无权限状态，不修改页面数据。
- 后台接口返回 `-1005` 时清理登录态，并在登录页展示“账号已被禁用，请联系管理员处理。”。

### 边界约束

- 管理端不新增数据库表。
- 管理端不新增权限角色配置、运营报表、审计日志、通知中心。
- 管理端只使用后端已有分页和过滤参数，不新增全文搜索。
- 除补齐 `GET /admin/tags` 读接口外，不改变后端状态流转规则。
- 普通用户端页面保持可用，不向普通用户展示管理端入口。

### 后端接口范围

| 前端能力 | 后端接口 |
|---------|---------|
| 用户列表 | `GET /admin/users` |
| 禁用用户 | `PATCH /admin/users/:id/disable` |
| 恢复用户 | `PATCH /admin/users/:id/enable` |
| 内容列表 | `GET /admin/contents` |
| 审核通过 | `PATCH /admin/contents/:id/approve` |
| 驳回内容 | `PATCH /admin/contents/:id/reject` |
| 下架内容 | `PATCH /admin/contents/:id/offline` |
| 删除内容 | `DELETE /admin/contents/:id` |
| 评论列表 | `GET /admin/comments` |
| 删除评论 | `DELETE /admin/comments/:id` |
| 标签列表 | `GET /admin/tags` |
| 新增标签 | `POST /admin/tags` |
| 修改标签 | `PATCH /admin/tags/:id` |
| 启用标签 | `PATCH /admin/tags/:id/enable` |
| 禁用标签 | `PATCH /admin/tags/:id/disable` |
| 文件列表 | `GET /admin/files` |
| 删除文件 | `DELETE /admin/files/:id` |
