<!--
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-14 18:08:02
 * @FilePath: /csgo-stats-tracker/README.md
 * @LastEditTime: 2025-05-15 18:41:19
-->
# CSGO 数据统计追踪应用

CSGO 玩家数据统计追踪应用，可查看玩家信息和游戏统计数据。

## 功能特点

- 通过 Steam ID 或用户名查询玩家数据
- 显示详细的 CSGO 统计信息
- 管理控制面板
- 账号管理系统
- 数据日志记录

## 技术栈

- Next.js 14 (App Router)
- Tailwind CSS
- Neon PostgreSQL 数据库
- Vercel Edge Functions

## 部署到 Vercel

按照以下步骤将应用部署到 Vercel 并配置 Neon 数据库：

1. 在 Vercel 创建新项目，选择从 GitHub 导入
2. 选择 Neon PostgreSQL 作为数据库提供商
3. 选择数据库区域（推荐 Washington, D.C., USA East）
4. 设置数据库名称（例如 "csgo2"）
5. 连接到项目时确保所有环境（Development, Preview, Production）都已勾选

## 配置环境变量

在 Vercel 中，系统会自动为你设置以下环境变量：

```
DATABASE_URL="postgresql://user:password@endpoint:port/database?sslmode=require"
```

如需本地开发，请创建 `.env.local` 文件并添加上述变量。

## 初始化数据库

部署成功后，访问以下 API 端点初始化数据库结构：

```
https://your-domain.vercel.app/api/init-db
```

这会创建必要的表和默认管理员账户（用户名: admin / 密码: admin123）

## 本地开发

```bash
# 安装依赖
npm install

# 创建 .env.local 并配置 DATABASE_URL

# 运行开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用

## 管理员登录

访问 `/admin` 路径，使用以下默认凭据登录：
- 用户名：admin
- 密码：admin123

登录后可以访问控制面板、管理账户和查看日志。

## 数据来源

本项目数据来源于:
- 完美世界CSGO API
- 4Cola游戏数据平台

## 贡献指南

欢迎提交Pull Request或Issue来改进这个项目。

## 许可证

MIT
