import comp from "D:/Github/SECTL/SECTL-hub/docs/.vuepress/.temp/pages/index.html.vue"
const data = JSON.parse("{\"path\":\"/\",\"title\":\"SECTL-hub\",\"lang\":\"zh-CN\",\"frontmatter\":{\"description\":\"SECTL-hub 正在加载图片... 预览图片 ×\"},\"readingTime\":{\"minutes\":3.61,\"words\":1082},\"filePathRelative\":\"README.md\",\"autoDesc\":true}")
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
