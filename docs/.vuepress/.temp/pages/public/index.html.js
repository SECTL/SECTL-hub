import comp from "D:/Github/SECTL/SECTL-hub/docs/.vuepress/.temp/pages/public/index.html.vue"
const data = JSON.parse("{\"path\":\"/public/\",\"title\":\"Public\",\"lang\":\"zh-CN\",\"frontmatter\":{\"title\":\"Public\",\"article\":false,\"feed\":false,\"sitemap\":false,\"head\":[[\"script\",{\"type\":\"application/ld+json\"},\"{\\\"@context\\\":\\\"https://schema.org\\\",\\\"@type\\\":\\\"WebPage\\\",\\\"name\\\":\\\"Public\\\"}\"],[\"meta\",{\"property\":\"og:url\",\"content\":\"https://SECTL-hub.netlify.app/public/\"}],[\"meta\",{\"property\":\"og:site_name\",\"content\":\"SECTL-hub\"}],[\"meta\",{\"property\":\"og:title\",\"content\":\"Public\"}],[\"meta\",{\"property\":\"og:type\",\"content\":\"website\"}],[\"meta\",{\"property\":\"og:locale\",\"content\":\"zh-CN\"}]]},\"readingTime\":{\"minutes\":0,\"words\":1},\"filePathRelative\":null}")
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
