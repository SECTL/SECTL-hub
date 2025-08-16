export const siteData = JSON.parse("{\"base\":\"/\",\"lang\":\"zh-CN\",\"title\":\"SECTL-hub\",\"description\":\"SECTL 交流群里面的乐子\",\"head\":[[\"link\",{\"rel\":\"icon\",\"href\":\"/logo.png\"}],[\"link\",{\"rel\":\"apple-touch-icon\",\"href\":\"/logo.png\"}]],\"locales\":{}}")

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateSiteData) {
    __VUE_HMR_RUNTIME__.updateSiteData(siteData)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ siteData }) => {
    __VUE_HMR_RUNTIME__.updateSiteData(siteData)
  })
}
