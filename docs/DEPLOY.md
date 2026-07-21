# 工作任务清单 - Supabase + Vercel 部署指南

## 架构

```
前端 (SolidJS + Vite) -> Vercel 静态托管
                          -> Supabase (PostgreSQL + Auth)
```

## 部署步骤

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com 注册账号
2. 创建新项目，选择 Singapore 区域
3. 在 SQL Editor 中运行 `supabase-schema.sql`
4. 在 Authentication > Users 中创建管理员账号（邮箱+密码）
5. 在 Settings > API 中获取 URL 和 anon key

### 2. 配置环境变量

在 `frontend/` 目录下创建 `.env.local` 文件：
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 本地测试

```bash
cd frontend
npm install
npm run build -- --base=/
```

### 4. 部署到 Vercel

1. 访问 https://vercel.com 注册账号
2. Import 项目仓库
3. 设置环境变量：
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. 部署

## 权限说明

| 角色 | 查看所有任务 | 添加待分配任务 | 修改待分配任务 | 处理所有任务 |
|------|------------|--------------|--------------|------------|
| 匿名（同事） | ✅ | ✅ | ✅（仅自己提交的） | ❌ |
| 登录（管理员） | ✅ | ✅ | ✅ | ✅ |

- 同士无需登录，直接访问网址即可查看任务和提交待分配
- 管理员点击页面顶部「登录」按钮登录后可处理所有任务