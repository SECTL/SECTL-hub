import { defineClientConfig } from '@vuepress/client'
import ImageGallery from './components/ImageGallery.vue'

export default defineClientConfig({
  enhance({ app }) {
    // 注册全局组件
    app.component('ImageGallery', ImageGallery)
  },
})