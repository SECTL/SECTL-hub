export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"D:/Github/SECTL/SECTL-hub/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":"SECTL-hub","icon":"home"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"D:/Github/SECTL/SECTL-hub/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
]);
