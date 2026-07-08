# admin-frontend 精简规格

> 来源：`changes/active/admin-frontend` 归档沉淀  
> 日期：2026-07-08  
> 阶段：第二阶段管理端前端

## 功能描述

在现有 `web/` React + Vite + TypeScript 前端工程中新增 `/admin` 管理端路由组，让管理员通过页面完成用户、内容、评论、标签和文件治理。管理端复用第一阶段登录态和 request 封装，并提供独立的 Governance Console 视觉系统。

## 核心流程

1. 管理员使用已有登录页登录。
2. 管理员访问 `/admin` 进入治理控制台。
3. 管理员进入用户、内容、评论、标签、文件页面执行治理操作。
4. 操作成功后页面展示成功反馈，并刷新当前列表。
5. 未登录访问管理端时跳转登录页；普通用户访问时显示无权限。

## 功能范围

| 能力 | 说明 |
|------|------|
| 管理端入口 | `/admin` 路由组，管理员可进入，未登录跳转登录，普通用户显示无权限 |
| 后台总览 | 展示用户、内容、评论、标签、文件五类治理入口和关键数量摘要 |
| 用户管理 | 分页、状态筛选、禁用 active 用户、恢复 disabled 用户 |
| 内容管理 | 分页、状态筛选、审核通过、驳回、下架、删除 |
| 评论管理 | 分页、按内容 ID 过滤、删除评论 |
| 标签管理 | 分页、状态筛选、新增、改名、启用、禁用 |
| 文件管理 | 分页、用途筛选、图片 URL 预览、删除 active 文件 |
| 统一反馈 | loading、empty、error、分页、成功/失败反馈 |
| 权限错误 | `-1004` 清理登录态并跳转登录；`-1006` 显示无权限；`-1005` 显示账号禁用提示 |

## 边界约束

- 不新增数据库表或新的业务状态流转。
- 不新增管理员创建、管理员密码修改、角色权限配置。
- 不新增运营报表、审计日志、通知中心。
- 不新增全文搜索能力，只使用后端已有分页和过滤参数。
- 普通用户端流程保持不变，不向普通用户展示管理端入口。
- 除补齐 `GET /admin/tags` 外，不修改其它后端接口范围。

## 关键文件

| 文件路径 | 作用 |
|---------|------|
| `web/src/api/admin.ts` | 后台 API 方法和管理端类型入口 |
| `web/src/routes/AdminRoute.tsx` | 管理端登录和管理员角色保护 |
| `web/src/components/AdminLayout.tsx` | 管理端侧栏、导航和工作台布局 |
| `web/src/components/AdminTable.tsx` | 管理端表格、分页、状态和无权限展示容器 |
| `web/src/pages/admin/AdminDashboardPage.tsx` | 后台治理总览页 |
| `web/src/pages/admin/AdminUsersPage.tsx` | 用户管理页 |
| `web/src/pages/admin/AdminContentsPage.tsx` | 内容审核治理页 |
| `web/src/pages/admin/AdminCommentsPage.tsx` | 评论治理页 |
| `web/src/pages/admin/AdminTagsPage.tsx` | 标签维护页 |
| `web/src/pages/admin/AdminFilesPage.tsx` | 文件治理页 |
| `web/src/styles/admin.css` | 管理端独立视觉系统 |
| `web/src/routes/AppRoutes.tsx` | 挂载 `/admin` 路由组 |
| `web/src/lib/errors.ts` | 统一识别 `-1006`、`-1005` 错误提示 |
| `web/src/lib/request.ts` | 认证失效清理与账号禁用提示保存 |
| `web/src/auth/session.ts` | 登录态和一次性认证提示存储 |
| `src/router/admin_router.js` | 后台路由，包含 `GET /admin/tags` |
| `src/controller/admin_controller.js` | 后台 controller 聚合入口 |
| `src/controller/tag_controller.js` | 后台标签列表响应 |
| `src/service/tag_service.js` | 后台标签分页查询 |

## 接口定义

| 前端方法 | 后端接口 | 说明 |
|---------|---------|------|
| `listAdminUsers` | `GET /admin/users` | 用户列表 |
| `disableAdminUser` | `PATCH /admin/users/:id/disable` | 禁用用户 |
| `enableAdminUser` | `PATCH /admin/users/:id/enable` | 恢复用户 |
| `listAdminContents` | `GET /admin/contents` | 内容列表 |
| `approveAdminContent` | `PATCH /admin/contents/:id/approve` | 审核通过 |
| `rejectAdminContent` | `PATCH /admin/contents/:id/reject` | 驳回内容 |
| `offlineAdminContent` | `PATCH /admin/contents/:id/offline` | 下架内容 |
| `deleteAdminContent` | `DELETE /admin/contents/:id` | 删除内容 |
| `listAdminComments` | `GET /admin/comments` | 评论列表 |
| `deleteAdminComment` | `DELETE /admin/comments/:id` | 删除评论 |
| `listAdminTags` | `GET /admin/tags` | 标签列表 |
| `createAdminTag` | `POST /admin/tags` | 新增标签 |
| `updateAdminTag` | `PATCH /admin/tags/:id` | 修改标签 |
| `enableAdminTag` | `PATCH /admin/tags/:id/enable` | 启用标签 |
| `disableAdminTag` | `PATCH /admin/tags/:id/disable` | 禁用标签 |
| `listAdminFiles` | `GET /admin/files` | 文件列表 |
| `deleteAdminFile` | `DELETE /admin/files/:id` | 删除文件 |

## 外部依赖

- React
- Vite
- TypeScript
- React Router
- lucide-react
- Koa 后端 `/admin/*` REST API

## 验证记录

- `npm run web:build`：通过。
- `npm test`：通过。
- 管理端 `/admin` 页面 HTTP 检查：已通过。
- 管理员访问 `/admin/tags` 返回 `code=0`：已确认。
