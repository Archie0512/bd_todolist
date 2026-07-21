# 工作任务清单看板

一个基于 React + Supabase 的简易任务管理看板，用于向领导罗列工作明细、跟踪任务流转。

> 本项目 fork 自开源项目 [Tasks.md](https://github.com/BaldissaraMatheus/Tasks.md)（MIT），原项目基于 SolidJS + Koa + Markdown 文件存储。本项目改造为 **React + Supabase + Netlify** 架构。

## ✨ 功能特性

- 📋 **6 列看板**：即时 / 待分配 / 退回 / 未完成 / 已完成 / 长期
- 🎯 **富文本编辑**：基于 TipTap 的 WYSIWYG 编辑器，支持 Markdown / RichText 双模式
- 🏷️ **标签系统**：平铺勾选式（非下拉），7 种主题色
- 📅 **截止日期**：内嵌 `[due:YYYY-MM-DD]` 标记，过期高亮
- ✅ **完成/退回 + 备注**：管理员操作时必填备注，记录完整流转历史
- 🖼️ **图片上传**：Supabase Storage 托管，点击放大预览
- 🤝 **匿名协作**：同事无需登录即可提交待办，对「待分配」/「退回」列有写权限
- 🎨 **三套主题**：Adwaita / Catppuccin / Nord，支持浅色/深色/跟随系统
- ⌨️ **键盘导航**：vim 风格 `h/j/k/l`、方向键、`n/r/d/e/?/Esc`
- 🌐 **国际化**：中文 / English / Español
- 📱 **响应式**：触屏支持（长按 500ms 激活拖拽）
- 🚀 **自动部署**：`git push` 即触发 Netlify 构建

## 🏗️ 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + react-router-dom 6 |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 + CSS 变量主题 |
| 状态管理 | zustand 5（+ persist 中间件） |
| 富文本 | TipTap 2 |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 动画 | framer-motion + React Bits 风格组件 |
| i18n | react-i18next |
| 后端 | Supabase（PostgreSQL + Auth + Storage） |
| 部署 | Netlify（Git 自动部署） |

详见 [docs/architecture.md](docs/architecture.md)。

## 🚀 快速开始

### 前置条件

- Node.js 20+（见 `.nvmrc`）
- npm 10+

### 本地开发

```bash
# 1. 进入 frontend 目录
cd frontend

# 2. 复制环境变量模板并填入 Supabase 凭据
cp .env.example .env
# 编辑 .env，填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY

# 3. 安装依赖
npm install

# 4. 启动 dev 服务器（默认 localhost:3000）
npm run dev
```

打开浏览器访问 http://localhost:3000

### 生产构建

```bash
cd frontend
npm run build:netlify    # 等价于 vite build --base=./（相对路径，用于 Netlify）
```

构建产物在 `frontend/dist/`。

### 部署到 Netlify

详见 [docs/DEPLOY.md](docs/DEPLOY.md)。简言之：
1. 把仓库连到 Netlify（Add new site -> Import from Git）
2. `netlify.toml` 已配置好构建命令
3. 设置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
4. `git push` 即自动部署

## 📁 项目结构

```
bd_todolist/
├── frontend/              # React 前端
├── backend/               # 本地 Koa 启动器（给非技术同事用）
├── db/                    # 数据库 schema
│   ├── supabase-schema.sql              # 全量最新（新环境初始化）
│   └── supabase-schema-migration-v2.sql # 增量 migration
├── docs/                  # 文档（DEPLOY/architecture/KEYBOARD_SHORTCUTS）
├── scripts/               # UI 自检脚本
├── netlify.toml           # Netlify 构建配置
└── .mcp.json.example      # Supabase MCP 模板
```

完整目录树见 [docs/architecture.md](docs/architecture.md)。

## 🔐 权限模型

通过 Supabase RLS（行级安全）在数据库层强制：

| 角色 | 查看任务 | 提交待办 | 改待分配/退回列 | 完成/退回 | 上传图片 |
|---|---|---|---|---|---|
| 匿名（同事） | ✅ | ✅ | ✅ | ❌ | 仅待分配/退回列 |
| 管理员 | ✅ | ✅ | ✅ | ✅ | 任意列 |

- 同事无需登录，直接访问 `https://bdtolist.netlify.app` 即可提交待办
- 管理员点页面顶部「登录」按钮，用邮箱密码登录后可处理所有任务

## 🗃️ 数据库初始化

新环境部署时，在 Supabase SQL Editor 运行 `db/supabase-schema.sql`（全量最新版，含 6 个默认 lane、card_status_logs 表、card-images bucket、RLS 策略）。

现有环境升级到 v2 时运行 `db/supabase-schema-migration-v2.sql`（增量 migration，幂等可重复执行）。

## 📚 文档

- [docs/DEPLOY.md](docs/DEPLOY.md) - 部署指南（Netlify + Git 自动部署 + Supabase MCP）
- [docs/architecture.md](docs/architecture.md) - 架构说明（React 迁移后）
- [docs/KEYBOARD_SHORTCUTS.md](docs/KEYBOARD_SHORTCUTS.md) - 键盘快捷键
- [AGENTS.md](AGENTS.md) - 仓库贡献指南 + 项目背景

## 📝 License

MIT（继承自原项目 Tasks.md）
