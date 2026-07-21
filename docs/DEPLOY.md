# 部署指南

## 架构

```
前端 (React 18 + Vite + Tailwind)  ──→  Netlify 静态托管（国内可访问）
                                         │
                                         └──→  Supabase (PostgreSQL + Auth + Storage)
                                                 Singapore 区域
```

**关键选择**：Netlify 而非 Vercel。原因：Vercel 国内访问超时（`ERR_CONNECTION_TIMED_OUT`），Netlify 国内可正常访问。

## 生产环境

- **生产 URL**：`https://bdtolist.netlify.app`
- **Supabase 项目**：`https://nzeujdjxawkbqfzrtblm.supabase.co`（Singapore）
- **构建产物**：`frontend/dist/`（相对路径 `./`，避免子路径 404）

## 自动部署流程（Git push 触发）

### 1. 初始化 Supabase（首次部署）

1. 注册 https://supabase.com 账号，创建新项目（Singapore 区域）
2. 在 SQL Editor 中运行 `db/supabase-schema.sql`（全量最新版，含 6 个 lane、card_status_logs、card-images bucket）
3. 在 Authentication > Users 中创建管理员账号（邮箱+密码）
4. 在 Settings > API 中获取：
   - Project URL
   - anon public key（受 RLS 保护，可暴露在前端）
5. 在 Account > Access Tokens 生成 access token（用于 Supabase MCP，可选）

### 2. 连接 Git 仓库到 Netlify

1. 把代码 push 到 Git 仓库（GitHub / Gitee 都行；国内访问 Gitee 更稳）
2. 访问 https://app.netlify.com，登录（可用 GitHub/GitLab/Email 注册）
3. Add new site → **Import an existing project** → 选 Git 仓库
4. Netlify 会自动读取仓库根目录的 `netlify.toml`，构建配置如下：
   - Base directory: `frontend/`
   - Build command: `npm run build -- --base=./`
   - Publish directory: `dist/`
5. **设置环境变量**（Site settings → Environment variables）：
   ```
   VITE_SUPABASE_URL=https://nzeujdjxawkbqfzrtblm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```
6. 点击 Deploy site

### 3. 日常部署

之后每次 `git push` 到主分支，Netlify 会自动：
1. 拉取最新代码
2. 在 `frontend/` 下 `npm install`
3. 执行 `npm run build -- --base=./`
4. 把 `frontend/dist/` 发布到 CDN

无需任何手工上传。部署日志在 Netlify 后台 → Deploys 查看。

## 手动部署（应急备用）

如果 Git 自动部署出问题，可临时手工上传：

```bash
cd frontend
npm install
npm run build -- --base=./
# 把 frontend/dist/ 整个目录拖到 Netlify 后台的 "Manual deploy"
```

## 本地开发

```bash
cd frontend
cp .env.example .env       # 首次需要，填入 Supabase URL + anon key
npm install
npm run dev                # 启动 Vite dev 服务器（localhost:3000）
```

## 验证部署成功

部署后访问 `https://bdtolist.netlify.app`，检查：
- [ ] 页面正常渲染，标题为「工作任务清单」
- [ ] 看到 6 个 lane（即时/待分配/退回/未完成/已完成/长期）
- [ ] 卡片从 Supabase 加载（应为真实数据，不是空 board）
- [ ] 点「登录」可进入管理员账号
- [ ] 登录后可拖动卡片、编辑内容、添加图片
- [ ] 匿名状态下只能编辑「待分配」和「退回」列

也可以跑 UI 自检脚本：
```bash
cd frontend
npm run dev                 # 启动 dev 服务器
# 另开一个终端
URL=http://localhost:3000/ npm run ui-check
```

## 权限模型（RLS 在数据库层强制）

| 角色 | 查看所有任务 | 加待分配 | 改待分配/退回列 | 完成/退回 | 上传图片 |
|------|------------|---------|---------------|---------|---------|
| 匿名（同事） | ✅ | ✅ | ✅ | ❌ | 仅待分配/退回列 |
| 登录（管理员） | ✅ | ✅ | ✅ | ✅ | 任意列 |

- 同事无需登录，直接访问网址即可查看任务、提交待分配、对「待分配」和「退回」列的卡片加图
- 管理员点击页面顶部「登录」按钮登录后可处理所有任务、完成/退回卡片、管理所有图片

## Supabase MCP（可选，便于数据库管理）

ZCode 工作区已配置 Supabase MCP 模板（见根目录 `.mcp.json.example`）。
**启用步骤**：

1. 在 Supabase Dashboard → Account → Access Tokens 生成 access token
2. 复制 `.mcp.json.example` 为 `.mcp.json`
3. 把 `<your-supabase-access-token>` 替换为实际 token
4. 重启 ZCode，即可在对话中通过 MCP 查询/管理 Supabase 数据库

**注意**：`.mcp.json` 已在 `.gitignore` 中，不会上传 Git，避免泄露 token。

## Netlify MCP 评估结论

Netlify 官方无 MCP server，社区版 `netlify-mcp` 维护停滞、功能有限。**不推荐配置**：
Git push 自动部署已覆盖「不要手工部署」的核心诉求，社区 MCP 反而增加维护负担。

## 常见问题

**Q: 部署后部分资源 404？**
A: 确认 `netlify.toml` 的 `build.command` 包含 `--base=./`。这是踩过的坑：Vite 默认生成绝对路径 `/assets/...`，在 Netlify 子路径下加载不到。

**Q: 部署后空白页？**
A: 打开浏览器 F12 看 Console。最常见原因是环境变量没设或设错了（Supabase URL/anon key）。检查 Netlify 后台 Site settings → Environment variables。

**Q: 国内访问慢？**
A: Netlify 国内访问通常 OK，但偶有波动。备选：把仓库同时连到 Gitee + 国内 CDN（如腾讯云 EdgeOne）做镜像。**不要换 Vercel**（国内超时是硬限制）。
