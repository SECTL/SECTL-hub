import comp from "D:/Github/SECTL/SECTL-hub/docs/.vuepress/.temp/pages/index.html.vue"
const data = JSON.parse("{\"path\":\"/\",\"title\":\"SECTL-hub\",\"lang\":\"zh-CN\",\"frontmatter\":{\"home\":true,\"icon\":\"home\",\"title\":\"SECTL-hub\",\"heroFullScreen\":false,\"footer\":\"由 SECTL 交流群成员共同维护\",\"description\":\"乐子展示\",\"head\":[[\"script\",{\"type\":\"application/ld+json\"},\"{\\\"@context\\\":\\\"https://schema.org\\\",\\\"@type\\\":\\\"WebPage\\\",\\\"name\\\":\\\"SECTL-hub\\\",\\\"description\\\":\\\"乐子展示\\\"}\"],[\"meta\",{\"property\":\"og:url\",\"content\":\"https://SECTL-hub.netlify.app/\"}],[\"meta\",{\"property\":\"og:site_name\",\"content\":\"SECTL-hub\"}],[\"meta\",{\"property\":\"og:title\",\"content\":\"SECTL-hub\"}],[\"meta\",{\"property\":\"og:description\",\"content\":\"乐子展示\"}],[\"meta\",{\"property\":\"og:type\",\"content\":\"website\"}],[\"meta\",{\"property\":\"og:locale\",\"content\":\"zh-CN\"}]]},\"readingTime\":{\"minutes\":0.17,\"words\":51},\"filePathRelative\":\"README.md\",\"autoDesc\":true}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
