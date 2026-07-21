# 架构说明

> 更新日期：2026-07-21
> 本文档记录 2026-07 完成的 React 迁移后的系统架构

## 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│  前端（React 18 SPA，Netlify 静态托管）                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  UI 层：components/                                    │  │
│  │  ├─ Header / Lane / Card / ExpandedCard              │  │
│  │  ├─ StatusActionDialog / StatusLogTimeline           │  │
│  │  ├─ BulkOperationsToolbar / LoginDialog              │  │
│  │  └─ react-bits/（ShimmerButton/AnimatedCard 等）     │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  状态层：store/（zustand）                             │  │
│  │  ├─ board-store  (lanes/cards/tags + CRUD/移动)    │  │
│  │  ├─ auth-store   (登录/登出/userEmail)              │  │
│  │  └─ ui-store     (sort/search/viewMode/theme 持久化) │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  数据访问层：lib/                                      │  │
│  │  ├─ supabase-client  (查询/CRUD/RLS 友好)           │  │
│  │  ├─ upload-image     (Storage 校验+上传)            │  │
│  │  ├─ card-content-utils ([tag:]/[due:] 解析)         │  │
│  │  └─ markdown         (marked + turndown 转换)       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS（Supabase REST + Storage）
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase（Singapore 区域）                                  │
│  ├─ PostgreSQL                                              │
│  │  ├─ lanes / cards / tags / card_tags / sort_orders      │
│  │  └─ card_status_logs（完成/退回备注历史）                 │
│  ├─ Auth（邮箱+密码，管理员账号）                              │
│  ├─ Storage（card-images bucket，公开读）                   │
│  ├─ RLS（行级安全策略）                                      │
│  └─ View（cards_with_details，JOIN lane/tags/status_logs）  │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 | 作用 |
|---|---|---|
| 框架 | React 18 + react-router-dom 6 | SPA + 路由（`/<cardname>.md` 打开 ExpandedCard） |
| 构建 | Vite 5 + @vitejs/plugin-react | 开发服务器 + 生产构建 |
| 样式 | Tailwind CSS 3 + CSS 变量主题 | 三套主题（adwaita/catppuccin/nord）通过 `data-theme` 切换 |
| 动画 | framer-motion + React Bits 风格组件 | 卡片入场/Shimmer/3D 倾斜，遵守 `prefers-reduced-motion` |
| 状态 | zustand 5 + persist 中间件 | 拆分为 board/auth/ui 三个 store，UI 偏好持久化到 localStorage |
| 富文本 | TipTap 2 + Image/Placeholder 扩展 | Markdown 字符串 ↔ HTML 双向转换（marked + turndown） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable | 横向 lane 重排 + 纵向卡片排序 + 跨列移动 + 触屏长按 |
| i18n | react-i18next + i18next | `{{var}}` 插值，zh/en/es 三语 |
| 图标 | lucide-react | 替代 stacks-icons |
| 后端 | Supabase | PostgreSQL + Auth + Storage，无自建后端 |

## 目录结构

```
bd_todolist/
├── AGENTS.md                  # 仓库贡献指南 + 项目背景
├── README.md                  # 项目说明
├── LICENSE                    # MIT
├── netlify.toml               # Netlify 构建配置（Git 自动部署）
├── .mcp.json.example          # Supabase MCP 模板（入 git）
├── .mcp.json                  # 实际 MCP 配置（gitignore，含 token）
├── .gitignore
├── .gitmodules                # submodule（Stacks-Editor，迁移后已弃用）
├── .nvmrc
│
├── frontend/                  # 前端
│   ├── index.html
│   ├── vite.config.js         # @vitejs/plugin-react
│   ├── tailwind.config.js     # 主题色变量映射
│   ├── postcss.config.js
│   ├── biome.json             # linter/formatter
│   ├── jsconfig.json          # @/ @components/ @lib/ @store/ 路径别名
│   ├── package.json
│   ├── .env                   # 本地 Supabase 凭据（gitignore）
│   ├── .env.example           # 占位符版本
│   ├── public/
│   │   └── favicon/           # 站点图标
│   └── src/
│       ├── main.jsx           # 应用入口（BrowserRouter + i18n + index.css）
│       ├── App.jsx            # 主组件（编排所有 UI + 键盘导航 + DnD）
│       ├── store/
│       │   ├── board-store.js # 数据 + 业务动作（含乐观更新）
│       │   ├── auth-store.js  # 登录状态
│       │   └── ui-store.js    # UI 偏好（persist 到 localStorage）
│       ├── lib/
│       │   ├── supabase-client.js  # 数据访问函数
│       │   ├── card-content-utils.js # [tag:]/[due:] 解析
│       │   ├── upload-image.js # 图片上传（含 lane 校验）
│       │   ├── markdown.js     # Markdown ↔ HTML
│       │   ├── utils.js        # getButtonCoordinates/handleKeyDown/useLongPress
│       │   └── cn.js          # clsx 类名合并
│       ├── hooks/
│       │   ├── useClickOutside.js
│       │   ├── useLocalStorage.js
│       │   └── useDebounce.js
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Lane*.jsx       # LaneName + 内联在 App.jsx 的 Lane
│       │   ├── Card.jsx
│       │   ├── CardName.jsx
│       │   ├── ExpandedCard.jsx # TipTap 富文本 + 标签 + 完成/退回 + 图片
│       │   ├── StatusActionDialog.jsx # 完成/退回 + 必填备注
│       │   ├── StatusLogTimeline.jsx # 状态历史时间线
│       │   ├── Menu.jsx / NameInput.jsx
│       │   ├── BulkOperationsToolbar.jsx
│       │   ├── LoginDialog.jsx / KeyboardHelpDialog.jsx
│       │   ├── Sortable.jsx    # @dnd-kit 包装器
│       │   └── react-bits/
│       │       ├── ShimmerButton.jsx
│       │       ├── TextShimmer.jsx
│       │       ├── AnimatedCard.jsx
│       │       └── TiltedCard.jsx
│       ├── i18n/
│       │   ├── index.js       # react-i18next 初始化
│       │   └── locales/
│       │       ├── zh.js / en.js / es.js
│       └── styles/
│           ├── index.css      # Tailwind 指令 + 全局样式 + ProseMirror 样式
│           └── color-themes/
│               ├── adwaita.css / catppuccin.css / nord.css
│
├── backend/                   # 本地 Koa 启动器（给非技术同事用，非生产）
│   ├── server.js / start.js
│   ├── 启动.bat / 停止.bat / run-hidden.vbs
│   └── README.md
│
├── db/
│   ├── supabase-schema.sql              # 全量最新 schema（新环境初始化用）
│   └── supabase-schema-migration-v2.sql # 增量 migration（已执行）
│
├── docs/
│   ├── DEPLOY.md             # 部署指南（Netlify + Git 自动部署）
│   ├── KEYBOARD_SHORTCUTS.md # 键盘快捷键说明
│   ├── architecture.md       # 本文档
│   └── screenshots/          # 调试截图归档
│
└── scripts/
    ├── check-browser.cjs     # Codex 时代浏览器调试脚本（已归档）
    ├── check-browser.mjs
    ├── test-playwright.cjs   # Playwright 早期测试脚本
    └── ui-check.cjs           # 当前 UI 自检脚本（headless）
```

## 数据流：乐观更新模式

所有卡片操作都遵循「本地先更新 → Supabase 后台异步同步」模式，确保 UI 即时响应：

```
用户操作（拖拽/编辑/完成）
       │
       ▼
zustand action（立即更新本地 state）
       │
       ├─ UI 立即重渲染 ✓
       │
       └─ 异步调用 supabase-client 函数
              │
              ├─ 成功 → 后台数据已同步（无需 UI 反馈）
              └─ 失败 → console.error + fetchData() 回滚
```

关键示例见 `store/board-store.js` 的 `moveCardToLane` / `handleCardsSortChange` / `updateCardContent`。

## 权限模型

RLS 在数据库层强制（见 `db/supabase-schema.sql`）：

| 角色 | cards（读） | cards（写） | card_status_logs | storage（读） | storage（写） |
|---|---|---|---|---|---|
| 匿名 | ✅ 全部 | 仅「待分配」「退回」列 | 读 ✅ / 写 ❌ | ✅ | ✅（前端校验 lane） |
| 登录 | ✅ 全部 | ✅ 全部 | 读 ✅ / 写 ✅ | ✅ | ✅ |

「完成/退回」按钮在前端按 `isAdmin` 控制可见性，数据库层也通过 RLS 拒绝匿名 INSERT card_status_logs。

## 关键设计决策

1. **状态用 zustand 而非 Context/Reducer**：原 SolidJS 的 25+ signals 拆成 3 个 store，zustand 的细粒度订阅避免 React Context 的「全树重渲染」问题。

2. **拖拽用 @dnd-kit 而非移植自定义引擎**：原 `drag-and-drop.jsx` 665 行深度依赖命令式 DOM 操作，在 React 中是反模式。@dnd-kit 声明式、支持嵌套容器、自带触屏长按，代码量降到 ~150 行。

3. **富文本用 TipTap 而非保留 StacksEditor**：StacksEditor 是 vendored 的 TS/webpack 项目，命令式实例化与 React 生态割裂。TipTap 是 React 原生，Markdown 通过 marked+turndown 双向转换保留 DB 兼容。

4. **样式用 Tailwind 而非 Stacks CSS**：Stacks CSS 与 React Bits 动画库不兼容。Tailwind 通过 CSS 变量映射保留了原 13 个主题色 token，三套主题用 `data-theme` 属性切换。

5. **备注用独立表而非字段**：`card_status_logs` 记录完整流转历史（action/remark/actor/created_at），可追溯每次完成/退回，比字段覆盖更灵活。

6. **退回列位于 sort_order=2**：紧邻「待分配」，同事一眼能看到被退回的待办，便于重新编辑后再次提交。

## 性能注意事项

- 当前 `npm run build` 产物 ~1MB（含 TipTap + framer-motion + @dnd-kit），gzip 后 ~310KB。若需优化，可考虑：
  - 按路由 dynamic import（ExpandedCard 异步加载）
  - `build.chunkSizeWarningLimit` 提高阈值
  - 把 lucide-react 改为按需导入
- Supabase 查询走 `cards_with_details` 视图（JOIN lane + tags + status_logs），单次请求拿全数据，避免 N+1。
