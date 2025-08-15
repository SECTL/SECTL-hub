import { hasGlobalComponent } from "D:/Github/SECTL/SECTL-hub/node_modules/@vuepress/helper/lib/client/index.js";
import Badge from "D:/Github/SECTL/SECTL-hub/node_modules/vuepress-plugin-components/lib/client/components/Badge.js";

import "D:/Github/SECTL/SECTL-hub/node_modules/@vuepress/helper/lib/client/styles/sr-only.css";

export default {
  enhance: ({ app }) => {
    if(!hasGlobalComponent("Badge")) app.component("Badge", Badge);
    
  },
  setup: () => {

  },
  rootComponents: [

  ],
};
