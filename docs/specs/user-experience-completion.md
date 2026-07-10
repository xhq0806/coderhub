# 普通用户端功能补齐与性能优化归档

## Proposal

本轮针对普通用户端从“可用 MVP+”向更接近企业级体验推进，重点补齐以下短板：路由未拆包、图片未懒加载、通知未读角标不同步、评论一次拉取 100 条、危险操作无确认、内容编辑不回显标签/图片、表单校验分散，以及本地开发代理缺少 `/notifications`。

## Spec

已实现规格：

- 路由级懒加载：页面组件通过 `React.lazy` 拆分 chunk，并复用 `StatusView` 作为加载态。
- 图片懒加载：用户端与管理文件缩略图的图片补充 `loading="lazy"` 和 `decoding="async"`。
- Vite 代理：开发代理补充 `/notifications`。
- 作者视角内容详情：新增 `GET /users/me/contents/:id`，用于作者编辑回显标签与图片。
- 我的内容编辑：点击编辑时拉取完整详情，回显正文、标签和图片，保存时提交完整关联集合。
- 评论分页：详情页评论改为每页 10 条，复用分页器，评论错误不阻塞内容详情。
- 通知同步：新增未读通知 Context，通知页已读操作后同步顶部角标。
- 危险操作确认与 Toast：删除内容/评论、移除图片、全部已读等操作增加确认与反馈。
- 基础表单校验：登录、注册、发布、编辑、评论、回复、资料维护接入基础校验。

## Design

关键设计选择：

- 不引入大型状态库，使用小型 Context 管理通知未读数。
- 不重构现有 UI 体系，新增轻量 ToastProvider 和 `confirmDanger` 作为反馈适配层。
- 后端作者详情复用 `content_service.buildDetail`，避免重复 tags/files 组装逻辑。
- 内容列表继续保持轻量，只有点击编辑时请求完整详情，兼顾性能与编辑体验。
- 评论分页由 `DetailPage` 持有分页状态，`CommentSection` 负责展示与交互。

## Coding Summary

主要变更文件：

- `web/vite.config.ts`：补充 `/notifications` 代理。
- `web/src/routes/AppRoutes.tsx`：路由级懒加载。
- `web/src/App.tsx`：接入 `UnreadNotificationProvider` 与 `ToastProvider`。
- `web/src/notifications/UnreadNotificationContext.tsx`：新增未读通知状态管理。
- `web/src/components/ToastProvider.tsx`：新增全局 Toast。
- `web/src/lib/feedback.ts`：新增危险操作确认封装。
- `web/src/lib/validation.ts`：新增基础校验工具。
- `src/service/content_service.js`：新增 `getMineDetail`。
- `src/controller/content_controller.js`：新增 `detailMine`。
- `src/router/user_router.js`：新增 `GET /users/me/contents/:id`。
- `web/src/api/contents.ts`：新增 `getMyContent`。
- `web/src/pages/MyContentsPage.tsx`：编辑回显、确认、Toast、校验。
- `web/src/pages/DetailPage.tsx`：评论分页状态。
- `web/src/components/CommentSection.tsx`：评论分页、确认、Toast、校验。
- `web/src/pages/NotificationsPage.tsx`：通知已读后同步角标。
- `web/src/pages/PublishPage.tsx`、`LoginPage.tsx`、`RegisterPage.tsx`、`ProfilePage.tsx`：基础校验与图片/反馈优化。
- `web/src/styles/global.css`：新增 Toast 样式。

## Reviewing Checklist

- 作者详情接口必须登录，且仅作者可访问。
- 公开详情 `GET /contents/:id` 仍只返回 published 内容。
- 编辑保存提交完整 `tagIds` 和 `fileIds`，避免误删已有标签/图片。
- 评论区使用后端 `PageResult.total`，不再以数组长度作为总数。
- 通知未读数由 Context 作为单一来源。
- 危险操作取消时不发请求。
- 表单校验失败时不发请求。
- 路由 lazy import 已适配命名导出。

## Verify Archive

已执行命令：

```bash
npm run web:build
npm test
```

验证结果：

- `npm run web:build` 通过，Vite 输出多个页面级 chunk，主入口从此前约 `302.80 kB / gzip 93.30 kB` 降至约 `253.31 kB / gzip 82.16 kB`。
- `npm test` 通过，核心系统接口测试通过。

建议后续手工验证：

1. 首页、详情、登录、注册、发布、我的内容、收藏、通知、资料、用户主页路由切换不白屏。
2. pending/rejected 内容点击编辑时，正文、标签、图片均正确回显。
3. 评论超过 10 条时可分页，发布/回复/删除后刷新符合预期。
4. 通知单条已读和全部已读后，顶部未读角标同步更新。
5. 删除内容/评论、移除图片、全部已读确认取消时不执行操作。
6. 空登录/注册、空发布、空评论/回复、超长资料等被前端校验拦截。

## Risks & Rollback

- 作者详情接口如需更隐私的错误语义，可将他人内容从 `FORBIDDEN` 调整为 `NOT_FOUND`。
- 当前确认框使用 `window.confirm`，后续可替换为自定义 Dialog，而调用点无需大改。
- Toast 使用 `Date.now() + Math.random()` 生成本地 ID，仅用于浏览器运行时 UI，不影响业务数据。
- 评论区仍是扁平回复模型；若后续需要楼中楼分页，应新增回复分页接口。
