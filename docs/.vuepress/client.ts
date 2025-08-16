import { defineClientConfig } from '@vuepress/client'
import ImageGallery from './components/ImageGallery.vue'
import VisitorCounter from './components/VisitorCounter.vue'

export default defineClientConfig({
  enhance({ app }) {
    // 注册全局组件
    app.component('ImageGallery', ImageGallery)
    app.component('VisitorCounter', VisitorCounter)
  },
})