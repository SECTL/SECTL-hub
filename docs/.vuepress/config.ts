import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  // 站点配置
  base: "/",
  lang: "zh-CN",
  title: "SECTL-hub",
  // description: "SECTL 交流群里面的乐子",
  
  // 打包工具配置
  bundler: viteBundler(),
  
  // 主题配置
  theme: hopeTheme({
    hostname: "https://sectl-hub.netlify.app",
    author: "SECTL",
    logo: "/logo.png",
    
    // 导航栏配置
    navbar: [
      { text: "乐子展示", link: "/" },
    ],
    
    // 侧边栏配置
    sidebar: false,
    
    // 主题外观配置 - 支持跟随系统主题
    darkmode: "auto",
    
    // 页面配置 - 移除所有页面信息展示
    pageInfo: false,
    
    // 主题颜色配置 - 简化为布尔值
    themeColor: true,
    
    // 插件配置
    plugins: {
      // 图片预览插件
      photoSwipe: true,
    },
  }),
  
  // 启用Markdown中的Vue组件
  markdown: {
    importCode: {
      handleImportPath: (str: string) => str,
    },
  },
});