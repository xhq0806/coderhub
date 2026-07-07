# 任务清单

> 来源: design.md
> 生成时间: 2026-07-06

## 实施任务

- [x] 【数据模型】(后端) 建立核心系统数据库结构
  - 目标: 建立 `coderhub` 数据库和用户、内容、评论、标签、文件及关联表，满足后续业务模块的数据存储需求。
  - 涉及文件: `database/schema.sql`
  - 预期结果: 本地 MySQL 可执行脚本完成建库建表，表字段、索引、外键和状态字段与 design.md 一致。
- [x] 【公共能力】(后端) 建立统一响应、错误和配置基础
  - 目标: 建立统一错误码、业务状态常量、响应工具、错误处理中间件和配置导出。
  - 涉及文件: `src/config/server.js`, `src/constants/error_codes.js`, `src/constants/status.js`, `src/utils/response.js`, `src/middleware/error_middleware.js`, `src/app/index.js`
  - 预期结果: controller/service 可通过统一工具返回成功响应和业务错误，未知错误统一转换为服务端错误。
- [x] 【认证】(后端) 实现密码与 token 认证基础
  - 目标: 支持密码加密比对、token 签发校验、登录状态校验、账号禁用校验和管理员校验。
  - 涉及文件: `src/utils/password.js`, `src/utils/token.js`, `src/middleware/auth_middleware.js`, `src/service/user_service.js`
  - 预期结果: 无 token、无效 token、禁用用户、普通用户访问后台均返回对应错误。
- [x] 【用户】(后端) 完善注册、登录和用户资料接口
  - 目标: 完成注册、登录、当前用户信息、资料维护、后台用户分页、禁用和恢复用户。
  - 涉及文件: `src/router/user_router.js`, `src/controller/user_controller.js`, `src/service/user_service.js`, `src/router/admin_router.js`, `src/controller/admin_controller.js`
  - 预期结果: 用户模块满足 spec 中注册、登录、资料维护和后台用户管理验收标准。
- [x] 【标签】(后端) 实现标签查询和后台维护
  - 目标: 完成用户端启用标签分页查询，以及后台新增、修改、启用、禁用标签。
  - 涉及文件: `src/router/tag_router.js`, `src/controller/tag_controller.js`, `src/service/tag_service.js`, `src/router/admin_router.js`, `src/controller/admin_controller.js`
  - 预期结果: 启用标签可被用户查询，重名、禁用标签和不存在标签路径被正确处理。
- [x] 【文件】(后端) 实现头像和内容图片上传管理
  - 目标: 支持头像图片、内容图片上传，支持后台文件分页和删除，并暴露 `/uploads` 静态资源。
  - 涉及文件: `src/middleware/upload_middleware.js`, `src/router/file_router.js`, `src/controller/file_controller.js`, `src/service/file_service.js`, `src/app/index.js`
  - 预期结果: 图片上传返回文件信息，非图片、文件过大和已删除文件引用被拦截。
- [x] 【内容】(后端) 实现动态发布、审核、公开查询和作者操作
  - 目标: 完成内容发布待审核、公开列表、公开详情、我的内容列表、作者编辑删除、后台审核治理。
  - 涉及文件: `src/router/content_router.js`, `src/controller/content_controller.js`, `src/service/content_service.js`, `src/router/admin_router.js`, `src/controller/admin_controller.js`
  - 预期结果: 内容状态流转和可见性满足 spec 要求。
- [x] 【评论】(后端) 实现评论、回复和删除
  - 目标: 完成公开内容评论、回复评论、评论分页、用户按权限删除和后台删除评论。
  - 涉及文件: `src/router/comment_router.js`, `src/controller/comment_controller.js`, `src/service/comment_service.js`, `src/router/admin_router.js`, `src/controller/admin_controller.js`
  - 预期结果: 评论、回复、删除权限和失败路径满足 spec 要求。
- [x] 【后台聚合】(后端) 整合后台管理入口
  - 目标: 统一挂载用户、内容、评论、标签、文件后台接口，并确保所有后台接口需要管理员权限。
  - 涉及文件: `src/router/admin_router.js`, `src/controller/admin_controller.js`, `src/app/index.js`
  - 预期结果: 普通用户访问后台接口返回无权限，管理员可访问后台管理能力。
- [x] 【测试验证】联调 + 功能测试
  - 目标: 验证注册、登录、上传、发布、审核、查询、评论和后台治理链路，并覆盖主要失败路径。
  - 涉及文件: `test/core-systems.test.js`, `package.json`, `changes/active/core-systems/tasks.md`
  - 预期结果: `npm test` 可运行并通过，tasks.md 完成状态更新为全部完成。

## 完成状态

> 进度: 10/10 已完成
