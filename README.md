# SECTL-hub

SECTL 交流群图片展示网站 - 基于 VuePress 和 Vue-Theme-Hope 框架搭建

## 添加图片

1. 将图片放入 `docs/public/images/` 文件夹
2. 支持 `.jpg`, `.png`, `.gif`, `.webp`, `.svg` 格式
3. 图片会自动在网站中显示

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request
5. 等待审核合并

## 功能特点

- 🖼️ **自动图片展示**: 自动展示 `docs/public/images/` 文件夹中的所有图片
- 📱 **响应式设计**: 适配手机、平板、桌面等各种设备
- 🔍 **图片预览**: 点击图片可放大查看
- 🤖 **自动化部署**: 支持 GitHub Actions 自动化部署

## 技术栈

- VuePress 2.0
- Vue-Theme-Hope 2.0
- Vue 3 + TypeScript
- GitHub Pages

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run docs:dev

# 构建项目
npm run docs:build
```