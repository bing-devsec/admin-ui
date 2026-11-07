---
name: blog-admin
description: 修改 admin-ui 管理端的 Vue 页面、登录续期、文章与草稿操作、图片管理或写作预览时使用。仅修改 Nuxt 前台或 JSON 工具时不使用。
---

# 博客管理端开发

本技能的源码路径均相对于 `admin-ui/` 仓库根目录。

## 定位页面与接口

- 本工程是 Vue + Vite 管理端；依赖和可用命令以当前 `package.json` 为准。
- 路由与登录标记逻辑在 `src/router/index.ts`，页面在 `src/views`，可复用交互在 `src/components`。
- HTTP 调用沿用 `src/utils/axios.ts`，接口变更同步核对同级 `meta-api` 的路由、`common/types` 和 handler。
- API base 为 `/api`；`vite.config.ts` 的本地开发端口为 4000，开发代理去掉 `/api` 后转给 8080 后端。
- 生产 `/api` 转发依赖 Nginx，不把 Vite 开发代理当作生产配置；不要为了本地调试改写生产地址。

## 保留认证和协议

- 后端业务响应是 `{code, message, data}`；成功通常为 HTTP 200、`code === 2000` 且空 `message`。
- 不以 Axios fulfilled 或 HTTP 200 直接显示保存成功，沿用相邻页面的业务错误处理。
- token 由 HttpOnly Cookie 保存；保留 `withCredentials`，不把 token 改存 localStorage。
- `localStorage.userID` 只控制界面登录标记，不能授予权限；后端响应决定登录是否有效。
- 4012 续期使用已有共享 Promise 合并并发刷新；4010/4011 清理标记并回登录页。
- 业务 ID 按字符串传递、比较和回填，不能用 `Number(id)` 破坏大整数精度。

## 内容操作与预览

- 文章编辑/提交入口在 `src/views/write-article.vue`、`src/components/submit-article.vue`。
- 草稿、已发布文章和发布动作是不同状态；保存草稿不能意外调用正式发布或覆盖线上文章。
- 改写保存、发布或删除流程时，跟踪后端是否已提交；请求报错后不盲目重发有副作用的操作。
- 维持表单、列表刷新、分页与当前选中条目的一致性；成功提示必须对应业务成功。
- 预览在 `src/components/article-preview.vue`，渲染工具为 `src/utils/markdown.ts`，语言映射为 `src/utils/shikiLanguages.ts`。
- Markdown 规则变更需核对同级 `portal-web` 的当前渲染入口，保证预览与真实文章一致；先搜索源码，旧文档路径可能失效。
- 按改动验证代码块、未知语言降级、KaTeX、Mermaid、标题锚点、表格与图片中的相关场景，保留现有 DOM/CSS 约定。
- 后台编辑器与浏览器专用库保留客户端生命周期，异步预览不能用旧任务结果覆盖较新输入。

## 验证和授权

- UI 或构建配置变更可执行 `npm run build`；当前没有独立测试或 typecheck 脚本，不虚构已通过的检查。
- 涉及交互时，在可用本地页面检查实际改变的桌面/窄屏行为及错误状态；构建通过不代表操作联调通过。
- 涉及认证或内容写入时，先确认隔离本地后端和测试数据，再验证相关链路；不能把生产文章当样例。
- 不为普通 UI 或编译检查启停 Go 后端；后端启停可能迁移、预热缓存并回写浏览量。
- 按当前任务授权完成常规修改和本地验证，无需新增统一批准步骤。
- 发布、删除真实内容、COS 删除或生产部署只在已有授权涵盖时执行；本技能不扩大范围。
- 交付说明用户可见变化、已做验证和仍依赖服务的部分；保留用户工作区中已有修改。
