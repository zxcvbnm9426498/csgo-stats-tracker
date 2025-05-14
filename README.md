<!--
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-14 18:08:02
 * @FilePath: /csgo-stats-tracker/README.md
 * @LastEditTime: 2025-05-14 20:41:09
-->
# CSGO 玩家战绩查询系统

这是一个使用Next.js开发的CSGO玩家战绩查询系统。用户可以通过输入玩家ID或Steam ID查询详细的游戏数据和战绩统计。

## 功能特点

- 支持通过用户ID和Steam ID两种方式查询
- 显示玩家基本信息和Steam资料
- 展示详细游戏统计数据，包括K/D比、胜率、爆头率等
- 提供直接链接到4Cola完整战绩页面
- 响应式设计，适配各种设备
- 管理员后台管理系统

## 技术栈

- [Next.js](https://nextjs.org/) - React框架
- [React](https://reactjs.org/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [React Hook Form](https://react-hook-form.com/) - 表单处理
- [React Hot Toast](https://react-hot-toast.com/) - 通知提示
- [Axios](https://axios-http.com/) - HTTP请求库
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config) - 轻量级键值数据存储

## 开始使用

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/yourusername/csgo-stats-tracker.git
cd csgo-stats-tracker
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 打开浏览器访问 http://localhost:3000

### 部署到Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fcsgo-stats-tracker)

1. 点击上方按钮
2. 登录Vercel账户
3. 按照指示完成部署流程

### 配置Vercel Edge Config

项目使用Vercel Edge Config作为数据存储解决方案，部署时需要进行以下配置：

1. 在Vercel控制台创建一个Edge Config存储：
   - 进入项目设置 > Storage > Edge Config
   - 点击"Create Edge Config"按钮创建一个新的配置
   - **重要**：确保在创建后启用了该 Edge Config（"Enabled"状态）

2. 将Edge Config连接到项目：
   - 在创建Edge Config后，点击"Link"按钮将其关联到当前项目
   - 或通过项目设置 > Storage 页面手动连接现有的Edge Config

3. 添加环境变量：
   - 进入项目设置 > Environment Variables
   - 添加`EDGE_CONFIG`环境变量，值为上一步创建的Edge Config ID（应在连接Edge Config后自动添加）
   - 添加`PASSWORD_SALT`环境变量，设置一个自定义的密码加盐字符串（可选但推荐）
   - 添加`INIT_API_KEY`环境变量，用于保护初始化API的访问（可选）

4. 重新部署项目以应用更改

5. 初始化数据：
   - 部署完成后，访问`/api/init-db`端点并提供`x-api-key`头部进行初始化
   - 默认会创建用户名为`admin`，密码为`admin123`的管理员账户
   - 您可以使用cURL或Postman发送请求：
     ```bash
     curl -X GET "https://your-app-url.vercel.app/api/init-db" -H "x-api-key: your-init-api-key"
     ```

## 数据来源

本项目数据来源于:
- 完美世界CSGO API
- 4Cola游戏数据平台

## 贡献指南

欢迎提交Pull Request或Issue来改进这个项目。

## 许可证

MIT
