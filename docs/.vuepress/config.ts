import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  // 站点配置
  base: "/",
  lang: "zh-CN",
  title: "SECTL-hub",
  head: [
    ['link', { rel: 'icon', href: '/SECTL_logo.svg' }],
    ['link', { rel: 'preload', href: '/SECTL_logo.svg', as: 'image', fetchpriority: 'high' }]
  ],
  
  // 打包工具配置
  bundler: viteBundler(),
  
  // 主题配置
  theme: hopeTheme({
    hostname: "https://hub.sectl.top",
    author: "SECTL",
    logo: '/SECTL_logo.svg',
    
    // 导航栏配置
    navbar: [
      { text: "SECTL 官网", link: "https://sectl.top" },
      { text: "SECTL-hub 主页", link: "/" },
      { text: "SECTL-hub 仓库", link: "https://github.com/SECTL/SECTL-hub" },
      { text: "SECTL 组织群", link: "https://qm.qq.com/q/PCqYgev4Em" },
    ],
    
    // 侧边栏配置
    sidebar: false,
    
    // 主题外观配置 - 启用主题切换按钮
    darkmode: "switch",
    
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
