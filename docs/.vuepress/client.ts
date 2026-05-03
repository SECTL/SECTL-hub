import { defineClientConfig } from '@vuepress/client'
import { definePhotoSwipeConfig } from '@vuepress/plugin-photo-swipe/client'
import ImageGallery from './components/ImageGallery.vue'

definePhotoSwipeConfig({
  bgClickAction: 'close',
  wheelToZoom: true,
})

export default defineClientConfig({
  enhance({ app }) {
    // 注册全局组件
    app.component('ImageGallery', ImageGallery)
  },
})
