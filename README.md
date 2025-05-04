# CSGO 玩家战绩查询系统

这是一个使用Next.js开发的CSGO玩家战绩查询系统。用户可以通过输入玩家ID或Steam ID查询详细的游戏数据和战绩统计。

## 功能特点

- 支持通过用户ID和Steam ID两种方式查询
- 显示玩家基本信息和Steam资料
- 展示详细游戏统计数据，包括K/D比、胜率、爆头率等
- 提供直接链接到4Cola完整战绩页面
- 响应式设计，适配各种设备

## 技术栈

- [Next.js](https://nextjs.org/) - React框架
- [React](https://reactjs.org/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [React Hook Form](https://react-hook-form.com/) - 表单处理
- [React Hot Toast](https://react-hot-toast.com/) - 通知提示
- [Axios](https://axios-http.com/) - HTTP请求库

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

## 数据来源

本项目数据来源于:
- 完美世界CSGO API
- 4Cola游戏数据平台

## 贡献指南

欢迎提交Pull Request或Issue来改进这个项目。

## 许可证

MIT
