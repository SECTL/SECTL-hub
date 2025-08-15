# SECTL-hub

SECTL 交流群里面的乐子 - 基于 Vue-Theme-Hope 框架搭建的图片展示网站

## 项目简介

本项目是一个基于 VuePress 和 Vue-Theme-Hope 主题搭建的图片展示网站，专门用于展示 SECTL 交流群的图片内容。

## 功能特点

- 🖼️ **自动图片展示**: 自动展示 `docs/public/images/` 文件夹中的所有图片
- 🎨 **白色背景**: 网站采用白色背景设计，简洁美观
- 📱 **响应式设计**: 适配手机、平板、桌面等各种设备
- 🔍 **图片预览**: 点击图片可放大查看，点击空白区域退出
- 🃏 **卡片布局**: 每张图片以卡片形式展示，图片在上、名称在下
- 🤖 **自动化部署**: 支持 GitHub Actions 自动化部署和 PR 自动合并

## 技术栈

- **框架**: VuePress 2.0
- **主题**: Vue-Theme-Hope 2.0
- **语言**: Vue 3 + TypeScript
- **部署**: GitHub Pages
- **自动化**: GitHub Actions

## 项目结构

```
SECTL-hub/
├── docs/                   # VuePress 文档目录
│   ├── .vuepress/          # VuePress 配置目录
│   │   ├── components/     # Vue 组件
│   │   └── config.ts       # 主配置文件
│   ├── public/             # 静态资源目录
│   │   └── images/         # 图片文件夹
│   ├── gallery/            # 图片展示页面
│   └── README.md           # 首页
├── .github/                # GitHub 配置目录
│   └── workflows/          # GitHub Actions 工作流
├── package.json            # 项目依赖配置
└── README.md               # 项目说明文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run docs:dev
```

### 3. 构建项目

```bash
npm run docs:build
```

## 添加图片

1. 将图片文件放入 `docs/public/images/` 文件夹
2. 支持的格式：`.jpg`, `.png`, `.gif`, `.webp`, `.svg`
3. 图片会自动在网站的图片展示页面中显示
4. 建议使用有意义的英文文件名

## 自动化功能

### GitHub Actions 部署
- 推送到 `main` 分支会自动构建并部署到 GitHub Pages
- PR 提交后会等待 2 小时自动合并（如果通过检查）

### PR 自动合并规则
- 等待 2 小时后自动合并
- 需要通过所有自动化检查
- 如果无法合并，会添加相应的评论说明

## 配置说明

### 白色背景设置
在 `docs/.vuepress/config.ts` 中配置了白色背景：

```typescript
bodyBg: "#ffffff",
```

### 图片展示功能
- 使用自定义 Vue 组件 `ImageGallery.vue`
- 支持点击放大查看
- 响应式卡片布局
- 自动换行展示

## 部署说明

项目使用 GitHub Pages 进行部署，部署地址为：
`https://sectl-hub.github.io`

## 贡献指南

1. Fork 本仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request
5. 等待自动合并（2小时后）

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- SECTL 交流群
