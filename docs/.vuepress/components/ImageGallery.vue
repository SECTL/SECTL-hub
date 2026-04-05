<template>
  <div class="masonry-gallery">
    
    <!-- 加载占位组件 -->
    <div v-if="loading && images.length === 0" class="loading-placeholder">
      <div 
        v-for="i in 12"
        :key="i" 
        class="placeholder-card"
        :style="{ height: getRandomHeight(250, 500) + 'px' }"
      ></div>
    </div>
    
    <!-- 空状态占位组件 -->
    <div v-else-if="images.length === 0" class="empty-state">
      <div class="empty-icon">📷</div>
      <h2 class="empty-title">图片画廊空空如也</h2>
      <p class="empty-description">
        看起来还没有发现任何图片，<br>
        让我们开始收集精彩瞬间吧！
      </p>
      <p class="empty-subtitle">
        支持格式：JPG、PNG、GIF、WebP、SVG<br>
        建议尺寸：建议宽度大于800px以获得最佳显示效果
      </p>
      
      <div class="empty-stats">
        <div class="empty-stat">
          <span class="empty-stat-value">0</span>
          <span class="empty-stat-label">已发现图片</span>
        </div>
        <div class="empty-stat">
          <span class="empty-stat-value">{{ getSupportedFormats().length }}</span>
          <span class="empty-stat-label">支持格式</span>
        </div>
      </div>
      
      <div class="empty-actions">
        <button class="refresh-btn" @click="reloadImages">
          <span>🔄 重新加载</span>
        </button>
      </div>
    </div>
    
    <template v-else>
      <div class="gallery-info">
        <div class="info-card">
          <span class="info-item">
            <strong>{{ images.length }}</strong> 张图片
          </span>
          <span class="info-item">
            <strong>{{ displayedImages.length }}</strong> 张已加载
          </span>
          <button class="refresh-btn small" @click="reloadImages">刷 新</button>
        </div>
      </div>
      
      <div 
        class="masonry-grid" 
        ref="masonryContainer"
        :style="{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }"
      >
        <div 
          v-for="(column, columnIndex) in columns" 
          :key="columnIndex" 
          class="masonry-column"
        >
          <div 
            v-for="(item, index) in column" 
            :key="(item.image.name || item.image) + '-' + index"
            class="masonry-item"
            :style="{ 
              animationDelay: (index * 0.05) + 's', 
              marginBottom: '16px'
            }"
          >
            <div class="masonry-card">
              <div class="card-image-container" :style="{ aspectRatio: getAspectRatio(item.image) }">
                <img 
                  :src="getImageUrl(item.image)" 
                  :alt="formatImageName(item.image)"
                  class="card-image"
                  :loading="item.globalIndex < 6 ? 'eager' : 'lazy'"
                  :fetchpriority="item.globalIndex < 2 ? 'high' : 'auto'"
                  decoding="async"
                  @load="handleImageLoad($event, item.image)"
                  @error="handleImageError($event, item.image)"
                />
                <div 
                  class="card-image-loading" 
                  v-if="!imageLoaded[(item.image.name || item.image)]"
                  :style="{ opacity: imageLoaded[(item.image.name || item.image)] ? 0 : 1 }"
                  style="transition: opacity 0.3s ease-out;"
                ></div>
              </div>
              <div class="card-content">
                <h3 class="card-title">{{ formatImageName(item.image) }}</h3>
                <div class="card-meta">
                  <span class="type-badge">{{ getImageType(item.image) }}</span>
                  <span class="date-badge" v-if="item.image.pushDate">{{ formatDate(item.image.pushDate) }}</span>
                  <span class="index-badge">{{ item.globalIndex + 1 }}/{{ images.length }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div ref="loadMoreSentinel" class="load-more-sentinel"></div>
    </template>
    
    <!-- 加载更多占位符 -->
    <div v-if="loadingMore" class="loading-more">
      <div class="loading-spinner"></div>
      <span>加载更多图片...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { withBase } from '@vuepress/client';

// 状态变量
const loading = ref(true);
const loadingMore = ref(false);
const images = ref([]);
const displayedImages = ref([]);
const failedImages = ref([]);
const imageLoaded = ref({});
const loadedCount = ref(0);
const masonryContainer = ref(null);
const loadMoreSentinel = ref(null);
const preloadHrefs = new Set();
const imageTimeouts = new Map();
const imageRatios = ref({});

// 瀑布流配置
const columnCount = ref(4); 
const batchSize = 12; 
const isLoading = ref(false);

// 瀑布流列
const columns = ref([]);

const minColumnWidth = 260;
  const columnGap = 25;
  const maxColumnCount = 8;
  
  const getImageKey = (image) => typeof image === 'object' ? image.name : image;

// 格式化图片名称
const formatImageName = (image) => {
  const filename = typeof image === 'object' ? image.name : image;
  const decodedName = decodeURIComponent(filename);
  const nameWithoutExt = decodedName.split('.').slice(0, -1).join('.');
  return nameWithoutExt;
};

// 获取图片类型
const getImageType = (image) => {
  const filename = typeof image === 'object' ? image.name : image;
  const extension = filename.split('.').pop()?.toUpperCase();
  return extension || 'IMAGE';
};

// 格式化日期显示 - 中国时间
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 获取支持的图片格式
const getSupportedFormats = () => {
  return ['JPG', 'JPEG', 'PNG', 'GIF', 'WebP', 'SVG'];
};

// 获取图片宽高比（用于瀑布流布局）
const getAspectRatio = (image) => {
  const key = getImageKey(image);
  const ratio = imageRatios.value[key];
  if (typeof ratio === 'number' && ratio > 0) {
    const minRatio = 0.75;
    const maxRatio = 2.4;
    return Math.min(maxRatio, Math.max(minRatio, ratio));
  }
  return 4 / 3;
};

const getContainerWidth = () => {
  const el = masonryContainer.value;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
  const width = el?.clientWidth || viewportWidth;
  return Math.min(width, viewportWidth);
};

const computeColumnCount = (containerWidth) => {
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
  const width = Math.min(Math.max(0, containerWidth || 0), viewportWidth);

  if (viewportWidth < 640) return 1;
  let count = 1;

  for (let next = 2; next <= maxColumnCount; next++) {
    const required = next * minColumnWidth + (next - 1) * columnGap;
    if (width >= required) count = next;
    else break;
  }

  return count;
};

const computeInitialVisibleCount = (columnsCount) => {
  const viewportHeight = window.innerHeight || 800;
  const estimatedItemHeight = 320;
  const rows = Math.ceil((viewportHeight * 1.4) / estimatedItemHeight);
  const count = rows * columnsCount;
  return Math.max(12, Math.min(48, count));
};

// 将图片分配到各列
const distributeImagesToColumns = () => {
  const containerWidth = getContainerWidth();
  const nextColumnCount = computeColumnCount(containerWidth);
  columnCount.value = nextColumnCount;

  // 同步 CSS 变量
  if (masonryContainer.value) {
    masonryContainer.value.style.setProperty('--masonry-columns', nextColumnCount);
  }

  const nextColumns = Array.from({ length: nextColumnCount }, () => []);
  const columnHeights = Array.from({ length: nextColumnCount }, () => 0);
  const colWidth = (containerWidth - columnGap * (nextColumnCount - 1)) / nextColumnCount;
  const metaHeight = 78;

  displayedImages.value.forEach((image, globalIndex) => {
    const ratio = getAspectRatio(image);
    const estimatedHeight = colWidth / ratio + metaHeight;

    let targetIndex = 0;
    let minHeight = columnHeights[0];
    for (let i = 1; i < columnHeights.length; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        targetIndex = i;
      }
    }

    nextColumns[targetIndex].push({ image, globalIndex });
    columnHeights[targetIndex] += estimatedHeight;
  });

  columns.value = nextColumns;
};

// 获取图片URL
const getImageUrl = (image) => {
  const filename = typeof image === 'object' ? image.name : image;
  // 使用 encodeURI 替代 encodeURIComponent，以保留 () 等在路径中合法的字符
  // 但对于 # 和 ? 仍需特殊处理（如果文件名包含它们的话，目前看没有）
  const encoded = encodeURI(filename).replace(/#/g, '%23').replace(/\?/g, '%3F');
  return withBase(`/images/${encoded}`);
};

// 生成随机高度用于占位符
const getRandomHeight = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 处理图片加载
const handleImageLoad = (event, image) => {
  const key = getImageKey(image);
  imageLoaded.value[key] = true;
  loadedCount.value++;
  
  // 确保加载动画在300ms后完全消失
  setTimeout(() => {
    imageLoaded.value[key] = true;
  }, 300);

  const timeoutId = imageTimeouts.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    imageTimeouts.delete(key);
  }

  const el = event?.target;
  const w = el?.naturalWidth;
  const h = el?.naturalHeight;
  if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
    const ratio = w / h;
    if (!imageRatios.value[key] || Math.abs(imageRatios.value[key] - ratio) > 0.01) {
      imageRatios.value[key] = ratio;
      distributeImagesToColumns();
    }
  }
};

// 处理图片加载错误
const handleImageError = (event, image) => {
  const key = typeof image === 'object' ? image.name : image;
  
  // 记录失败的图片
  failedImages.value.push(key);
  imageLoaded.value[key] = true;
  loadedCount.value++;
  
  // 直接结束加载状态，显示错误占位符
  event.target.style.display = 'none';
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-placeholder';
  errorDiv.style.cssText = `
    background: #f5f5f5;
    color: #666;
    padding: 20px;
    text-align: center;
    font-size: 0.9rem;
    border-radius: 8px;
    border: 1px dashed #ddd;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  `;
  errorDiv.innerHTML = `
    <div style="font-size: 2rem; margin-bottom: 10px;">📷</div>
    <div>图片加载失败</div>
    <div style="font-size: 0.7rem; color: #999; margin-top: 5px;">${key}</div>
  `;
  event.target.parentNode.appendChild(errorDiv);

  const timeoutId = imageTimeouts.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    imageTimeouts.delete(key);
  }
};

// 滚动加载更多
const handleScroll = () => {
  if (isSentinelInLoadRange()) loadMoreImages();
};

const isSentinelInLoadRange = () => {
  const sentinel = loadMoreSentinel.value;
  if (!sentinel) return false;
  const rect = sentinel.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.top <= viewportHeight + 800;
};

// 加载下一批图片
const loadMoreImages = async () => {
  if (isLoading.value || displayedImages.value.length >= images.value.length) return;
  
  isLoading.value = true;
  loadingMore.value = true;
  
  const startIndex = displayedImages.value.length;
  const endIndex = Math.min(startIndex + batchSize, images.value.length);
  const newImages = images.value.slice(startIndex, endIndex);

  for (const image of newImages) {
    const key = getImageKey(image);
    if (imageLoaded.value[key] !== true) imageLoaded.value[key] = false;

    if (!imageTimeouts.has(key)) {
      const timeoutId = setTimeout(() => {
        if (imageLoaded.value[key] === false) {
          imageLoaded.value[key] = true;
        }
        imageTimeouts.delete(key);
      }, 8000);
      imageTimeouts.set(key, timeoutId);
    }
  }
  
  // 延迟加载以展示加载动画
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 将新图片添加到已显示图片列表的末尾
  displayedImages.value = [...displayedImages.value, ...newImages];
  
  distributeImagesToColumns();
  
  isLoading.value = false;
  loadingMore.value = false;

  schedule(() => preloadImages(newImages, 4));

  await nextTick();
  if (isSentinelInLoadRange()) loadMoreImages();
};

const shouldEnablePreload = () => {
  const connection = navigator?.connection;
  if (connection?.saveData) return false;
  const effectiveType = connection?.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
  return true;
};

const addPreloadLink = (href) => {
  if (preloadHrefs.has(href)) return;
  preloadHrefs.add(href);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  link.fetchPriority = 'high';
  link.dataset.sectlPreload = 'true';
  document.head.appendChild(link);
};

const preloadImages = (list, count) => {
  if (!shouldEnablePreload()) return;

  const targets = list.slice(0, count);
  for (const image of targets) {
    const href = getImageUrl(image);
    addPreloadLink(href);
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = href;
  }
};

const schedule = (cb) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 1500 });
  } else {
    setTimeout(cb, 250);
  }
};
 
// 获取图片列表 - 动态加载
const fetchImages = async () => {
  try {
    loading.value = true;

    let imageList = [
        { name: '（把藏狐绑起来）.png', pushDate: '2025-08-16' },
        { name: '(拿出绳子,一把捆住藏狐).png', pushDate: '2025-08-16' },
        { name: '《恩情还不完》.jpg', pushDate: '2026-03-15' },
        { name: '《哥 你 有 病 吧》.png', pushDate: '2026-03-18' },
        { name: '《你的那个S_B》.png', pushDate: '2026-03-06' },
        { name: '《你个SecBoard》.png', pushDate: '2026-03-06' },
        { name: '《我 就 是 你 哥》.png', pushDate: '2026-03-16' },
        { name: '《硝苯氮》.png', pushDate: '2026-03-16' },
        { name: '《hub-push》.png', pushDate: '2025-10-06' },
        { name: '《sectl的构成》.png', pushDate: '2026-02-28' },
        { name: '114种🌞本新的方法-1.png', pushDate: '2025-10-25' },
        { name: '114种🌞本新的方法-2.png', pushDate: '2025-10-25' },
        { name: '爱什么？我们一个群男生啊.png', pushDate: '2026-02-08' },
        { name: '安能辨我是雄雌.jpg', pushDate: '2026-03-04' },
        { name: '傲娇藏狐哈气了.jpg', pushDate: '2026-01-18' },
        { name: '傲娇猫猫哈气了.png', pushDate: '2025-08-20' },
        { name: '傲娇起来了.jpg', pushDate: '2026-02-01' },
        { name: '霸道黎总和他的qq数字小娇妻（？）.png', pushDate: '2026-02-24' },
        { name: '被爱到力竭的藏狐驾鹤西去了.png', pushDate: '2026-02-08' },
        { name: '被逼疯的生物.png', pushDate: '2025-08-26' },
        { name: '被威胁了就眨眼.png', pushDate: '2025-08-17' },
        { name: '被Pro价钱惊呆的丙烯.jpg', pushDate: '2026-02-01' },
        { name: '本群认证猫娘cjt，严禁模仿.jpg', pushDate: '2026-02-01' },
        { name: '本新：我还活着.png', pushDate: '2025-08-29' },
        { name: '本新：要不我给实例装个桌面环境.jpg', pushDate: '2026-02-01' },
        { name: '本新的出场动作真帅.png', pushDate: '2025-10-25' },
        { name: '本新对刘将军史诗巨作的评价.png', pushDate: '2025-08-22' },
        { name: '本新名言.png', pushDate: '2025-10-25' },
        { name: '本新是人机？！.png', pushDate: '2025-08-20' },
        { name: '病娇本新.png', pushDate: '2026-01-16' },
        { name: '病娇三连.jpg', pushDate: '2026-02-01' },
        { name: '不知道谁写的史山.png', pushDate: '2025-08-23' },
        { name: '藏狐：跟我家抢生意？.png', pushDate: '2026-02-08' },
        { name: '藏狐：我踏马，作业起爆！！.png', pushDate: '2025-10-03' },
        { name: '藏狐：吱吱.png', pushDate: '2025-11-22' },
        { name: '藏狐宝贵的第一次.png', pushDate: '2025-08-24' },
        { name: '藏狐不管了.jpg', pushDate: '2026-03-07' },
        { name: '藏狐藏狐，我爱你，就像老鼠爱大米（）.png', pushDate: '2026-02-08' },
        { name: '藏狐的花言巧语馁，真（不）可爱😋.png', pushDate: '2026-02-26' },
        { name: '藏狐的孽缘.png', pushDate: '2026-03-01' },
        { name: '藏狐的挑担就是好用.png', pushDate: '2025-11-15' },
        { name: '藏狐黑化ing.png', pushDate: '2025-08-16' },
        { name: '藏狐叫了.png', pushDate: '2025-08-23' },
        { name: '藏狐进山.png', pushDate: '2025-08-23' },
        { name: '藏狐你是有什么心事吗.jpg', pushDate: '2026-02-01' },
        { name: '藏狐是…（？）.png', pushDate: '2026-02-26' },
        { name: '藏狐是女同（bushi.png', pushDate: '2026-02-26' },
        { name: '藏狐自己养异世界の藏狐.png', pushDate: '2025-08-17' },
        { name: '藏狐の白白嫩嫩的身体.png', pushDate: '2025-11-09' },
        { name: '藏壶.png', pushDate: '2026-02-23' },
        { name: '茶馆馆主带头喝茶.png', pushDate: '2025-08-18' },
        { name: '打包大蛇.png', pushDate: '2026-01-11' },
        { name: '打工人怒吼没钱.jpg', pushDate: '2026-02-01' },
        { name: '大型🤖养殖场（雾）.png', pushDate: '2025-08-26' },
        { name: '大型嚼茶现场.png', pushDate: '2025-08-18' },
        { name: '大SECTL帝国.png', pushDate: '2026-02-28' },
        { name: '倒反天罡，这机器人到底学到了什么奇怪东西.png', pushDate: '2025-10-04' },
        { name: '地府苦力怕？.png', pushDate: '2026-02-08' },
        { name: '等离子藏狐炮，砰！.png', pushDate: '2025-10-02' },
        { name: '叠字大狮.png', pushDate: '2025-10-03' },
        { name: '东北粗口.png', pushDate: '2025-08-16' },
        { name: '东北方言.png', pushDate: '2025-08-17' },
        { name: '都是文明人.jpg', pushDate: '2026-02-01' },
        { name: '诶嘿.jpg', pushDate: '2026-03-01' },
        { name: '发情的输入法.png', pushDate: '2025-08-17' },
        { name: '方言狐.png', pushDate: '2025-08-23' },
        { name: '飞什么过去.png', pushDate: '2026-02-26' },
        { name: '干净利索，不拖泥带水.png', pushDate: '2025-12-16' },
        { name: '淦亖你啊.png', pushDate: '2025-08-16' },
        { name: '高端优雅的点名动画.png', pushDate: '2025-08-22' },
        { name: '革命夫妻.jpg', pushDate: '2026-04-05' },
        { name: '给藏狐调成啥了.jpg', pushDate: '2026-02-01' },
        { name: '给虾哥点上.png', pushDate: '2025-11-28' },
        { name: '官方吐槽.png', pushDate: '2025-10-11' },
        { name: '官方玩梗，最为致命.png', pushDate: '2026-02-08' },
        { name: '还有高手.png', pushDate: '2026-02-08' },
        { name: '河里.jpg', pushDate: '2026-02-01' },
        { name: '很好的问题.png', pushDate: '2025-10-11' },
        { name: '很精准的翻译.png', pushDate: '2025-08-20' },
        { name: '狐狸狐狸我爱你.png', pushDate: '2026-02-08' },
        { name: '狐言狐语.jpg', pushDate: '2026-02-01' },
        { name: '狐言乱语，秦王迷惑.png', pushDate: '2025-08-17' },
        { name: '幻想OS.png', pushDate: '2025-08-23' },
        { name: '婚戒成就.png', pushDate: '2025-08-26' },
        { name: '机械飞升，但是得插电.png', pushDate: '2025-10-05' },
        { name: '结合上下文，不难得出黎泽懿是（）控.png', pushDate: '2025-11-09' },
        { name: '今年过年奖品真多，这只狐狸包邮吗.png', pushDate: '2026-02-08' },
        { name: '经典咏流传.png', pushDate: '2026-02-24' },
        { name: '惊现m开发者，竟让机器人做出这种事情....png', pushDate: '2025-10-25' },
        { name: '开学后生命的转折点.png', pushDate: '2025-08-18' },
        { name: '看得出来很爱了.png', pushDate: '2026-02-08' },
        { name: '科技感分黎泽懿.png', pushDate: '2026-02-08' },
        { name: '狂狐日记.jpg', pushDate: '2026-03-21' },
        { name: '来自姜胤の赞赏.png', pushDate: '2026-01-15' },
        { name: '牢黎的吐槽.jpg', pushDate: '2026-02-01' },
        { name: '牢虾与黎泽懿的吉列豆蒸.png', pushDate: '2025-11-25' },
        { name: '黎大夫妙手回春啊.png', pushDate: '2025-10-25' },
        { name: '黎萌懿：我踏马一点也不好.jpg', pushDate: '2026-02-18' },
        { name: '黎萌懿你别死了.jpg', pushDate: '2026-02-18' },
        { name: '黎泽懿：合着我™必须要早恋是吧.png', pushDate: '2026-03-03' },
        { name: '黎泽懿：你来~.png', pushDate: '2025-10-07' },
        { name: '黎泽懿：卫生巾这梗过不去了是吧.png', pushDate: '2025-10-04' },
        { name: '黎泽懿：医药费不支持报销.jpg', pushDate: '2026-02-01' },
        { name: '黎泽懿不行啊，怎么冷却时间这么长啊~~.png', pushDate: '2025-10-25' },
        { name: '黎泽懿是AI做的.png', pushDate: '2025-11-08' },
        { name: '黎泽懿滞销.png', pushDate: '2025-08-16' },
        { name: '翎想要啦（嘿嘿）.jpg', pushDate: '2026-03-29' },
        { name: '翎想要啦🥵.jpg', pushDate: '2026-03-29' },
        { name: '龙尊本色.jpeg', pushDate: '2025-08-16' },
        { name: '满足你的愿望.png', pushDate: '2026-02-18' },
        { name: '冒烟的撤回键.png', pushDate: '2025-08-26' },
        { name: '没有藏狐，满满的都是幸福.png', pushDate: '2025-11-09' },
        { name: '没有什么插？！.png', pushDate: '2025-08-29' },
        { name: '秒商店开仓老观众.png', pushDate: '2025-08-19' },
        { name: '你管？.png', pushDate: '2025-08-17' },
        { name: '你好，泽懿.jpg', pushDate: '2026-02-01' },
        { name: '你好刘同学.png', pushDate: '2025-08-22' },
        { name: '你妈比的！.png', pushDate: '2025-08-16' },
        { name: '你想象中的黎泽懿何必是黎泽懿.png', pushDate: '2025-08-23' },
        { name: '你知道教你这一段，我把笔甩出去多少次吗.png', pushDate: '2025-11-26' },
        { name: '你指的不是Gay，对吧.png', pushDate: '2026-02-08' },
        { name: '你最好在说gun，而不是别的东西...png', pushDate: '2025-10-02' },
        { name: '偶然相遇.png', pushDate: '2025-10-25' },
        { name: '勤俭持家の狐.jpg', pushDate: '2026-02-01' },
        { name: '请读者自行想象此画面，SECTL不作任何指导.png', pushDate: '2025-11-16' },
        { name: '请群友们注意卫生，勿效仿口臭XXS.png', pushDate: '2025-09-14' },
        { name: '请输入文本.png', pushDate: '2025-11-26' },
        { name: '群主很忙.png', pushDate: '2025-10-03' },
        { name: '群主认证_70.png', pushDate: '2025-08-24' },
        { name: '群主认证_85.png', pushDate: '2025-08-24' },
        { name: '群主认证.png', pushDate: '2025-08-24' },
        { name: '群主认证的男娘.png', pushDate: '2025-08-24' },
        { name: '群主是一种性取向.png', pushDate: '2026-02-08' },
        { name: '群主说话显得自己很憨.png', pushDate: '2025-08-17' },
        { name: '群主最好玩.png', pushDate: '2025-10-11' },
        { name: '让藏狐成为更好的自己，加98号汽油！.jpg', pushDate: '2026-02-26' },
        { name: '让我回哪里去？？.png', pushDate: '2025-08-17' },
        { name: '热知识：那玩意指雌二醇.png', pushDate: '2026-02-08' },
        { name: '人机也懂，看来确实不是滋味_14.png', pushDate: '2025-10-06' },
        { name: '人机也懂，看来确实不是滋味.png', pushDate: '2025-10-06' },
        { name: '人与bot大型互殴现场.png', pushDate: '2025-08-21' },
        { name: '如何跟领导混熟_76.png', pushDate: '2025-10-18' },
        { name: '入典.png', pushDate: '2025-08-16' },
        { name: '赛博灯泡.png', pushDate: '2025-10-06' },
        { name: '啥情况.jpg', pushDate: '2026-03-15' },
        { name: '烧纸ing.png', pushDate: '2026-02-08' },
        { name: '设置班级.png', pushDate: '2025-11-01' },
        { name: '身体暖暖的东西.png', pushDate: '2025-08-23' },
        { name: '师父别说了.jpg', pushDate: '2026-02-01' },
        { name: '双重妈比.png', pushDate: '2025-08-16' },
        { name: '说明黎泽懿是….png', pushDate: '2025-12-13' },
        { name: '思 想 风 暴.png', pushDate: '2025-08-23' },
        { name: '螳螂捕蝉SECTL在后.png', pushDate: '2026-02-28' },
        { name: '体毛茂盛的龙娘.png', pushDate: '2026-01-27' },
        { name: '童言无忌.png', pushDate: '2025-08-29' },
        { name: '拖出去斩了.png', pushDate: '2025-08-16' },
        { name: '我↗cnm↘️.png', pushDate: '2026-03-02' },
        { name: '我爱你.png', pushDate: '2026-02-08' },
        { name: '我不管.png', pushDate: '2025-08-16' },
        { name: '我服了.png', pushDate: '2026-02-28' },
        { name: '我后台软件应该不多吧.png', pushDate: '2025-09-20' },
        { name: '我叫你一声你敢答应吗.png', pushDate: '2025-11-26' },
        { name: '我们不认黎泽懿，我们忠于SECTL.png', pushDate: '2026-03-01' },
        { name: '我这个级别的cjt有权利哈任何人.png', pushDate: '2026-01-27' },
        { name: '吸藏狐.png', pushDate: '2025-09-20' },
        { name: '喜欢被霸.png', pushDate: '2025-08-17' },
        { name: '香香软软…….png', pushDate: '2025-10-11' },
        { name: '香香软软吹弹可破的藏狐_85.png', pushDate: '2025-08-23' },
        { name: '香香软软吹弹可破的藏狐.png', pushDate: '2025-08-23' },
        { name: '香香软软群主.png', pushDate: '2025-08-23' },
        { name: '小飞侠彼得·泽懿·潘.png', pushDate: '2025-11-09' },
        { name: '小毛毛群主.png', pushDate: '2025-08-23' },
        { name: '小小小小小藏狐.png', pushDate: '2025-08-16' },
        { name: '嘘，小点声.png', pushDate: '2026-02-08' },
        { name: '雪野狐是男娘！（被打死）.png', pushDate: '2026-03-21' },
        { name: '叶背影：请输入文本.png', pushDate: '2026-02-18' },
        { name: '一世阴名.png', pushDate: '2025-08-17' },
        { name: '已抄送藏狐本人，他拒绝了Gay.png', pushDate: '2026-02-08' },
        { name: '意义美好的英文.png', pushDate: '2025-08-23' },
        { name: '永远怀念黎泽懿.png', pushDate: '2026-03-01' },
        { name: '有盒同享.png', pushDate: '2025-08-17' },
        { name: '又一个写代码疯了的.png', pushDate: '2026-02-08' },
        { name: '粤韵风华.png', pushDate: '2025-08-16' },
        { name: '杂交龙娘，香香软软.png', pushDate: '2025-08-23' },
        { name: '再发情让你飞起来.png', pushDate: '2026-02-08' },
        { name: '再盒就是盒装饮料了.png', pushDate: '2025-08-21' },
        { name: '在某中学就读的初三生.png', pushDate: '2025-11-08' },
        { name: '长易句.png', pushDate: '2025-08-22' },
        { name: '招魂.png', pushDate: '2026-02-08' },
        { name: '这个能播吗.png', pushDate: '2026-02-08' },
        { name: '这话不兴说啊.jpg', pushDate: '2026-02-01' },
        { name: '这事说不准.png', pushDate: '2025-10-25' },
        { name: '这ai没救了.png', pushDate: '2026-02-18' },
        { name: '珍贵回忆.png', pushDate: '2025-08-16' },
        { name: '震撼首发：QQ根据黎泽懿的照片生成的QQ秀.png', pushDate: '2026-03-01' },
        { name: '只有精没有华消息.png', pushDate: '2025-08-18' },
        { name: '拽拽的黎泽懿.png', pushDate: '2025-11-09' },
        { name: '作业滞销，帮帮黎泽懿.png', pushDate: '2025-08-20' },
        { name: 'AI调用AI.png', pushDate: '2026-03-01' },
        { name: 'CJK女装😋.jpg', pushDate: '2026-02-20' },
        { name: 'CJT的第一次......全身照.png', pushDate: '2025-11-08' },
        { name: 'Deepthinking.png', pushDate: '2025-08-16' },
        { name: 'Follow me！龙娘姐↓姐↑~~~.png', pushDate: '2025-10-02' },
        { name: 'Fox直播.jpg', pushDate: '2026-02-01' },
        { name: 'Grok-SECTL纯享版.png', pushDate: '2025-08-18' },
        { name: 'i 何懿味.png', pushDate: '2025-10-11' },
        { name: 'learn dam.png', pushDate: '2025-11-08' },
        { name: 'Loading....cute藏狐.png', pushDate: '2026-02-03' },
        { name: 'lrs2187第二次露出手手.jpg', pushDate: '2026-02-03' },
        { name: 'lrs2187首次露手.jpg', pushDate: '2026-02-03' },
        { name: 'O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A- JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA.png', pushDate: '2025-08-17' },
        { name: 'pH大于12.png', pushDate: '2025-08-23' },
        { name: 'SECTL官方白骨精.png', pushDate: '2025-10-11' },
        { name: 'SECTL官方认证的白骨精.png', pushDate: '2025-10-11' },
        { name: 'sectlmiao.png', pushDate: '2025-08-20' },
        { name: 'Star保卫战.png', pushDate: '2025-11-08' },
        { name: 'Super黎泽懿.png', pushDate: '2025-10-02' },
        { name: 'xwei 是谁🥵不认识.jpg', pushDate: '2026-02-25' },
        { name: 'Xwei我喜欢你.png', pushDate: '2026-01-01' }
      ];
    
    try {
      const response = await fetch(withBase('/images/manifest.json'), { cache: 'force-cache' });
      if (response.ok) {
        const manifest = await response.json();
        if (Array.isArray(manifest)) {
          imageList = manifest.map((item) => {
            if (typeof item === 'string') return { name: item };
            if (item && typeof item === 'object' && item.name) return item;
            return null;
          }).filter(Boolean);
        }
      }
    } catch (e) {}

    if (imageList.length === 0) {
      imageList = [
        { name: '（把藏狐绑起来）.png', pushDate: '2025-08-16' },
        { name: '(拿出绳子,一把捆住藏狐).png', pushDate: '2025-08-16' },
        { name: '《恩情还不完》.jpg', pushDate: '2026-03-15' },
        { name: '《哥 你 有 病 吧》.png', pushDate: '2026-03-18' },
        { name: '《你的那个S_B》.png', pushDate: '2026-03-06' },
        { name: '《你个SecBoard》.png', pushDate: '2026-03-06' },
        { name: '《我 就 是 你 哥》.png', pushDate: '2026-03-16' },
        { name: '《硝苯氮》.png', pushDate: '2026-03-16' },
        { name: '《hub-push》.png', pushDate: '2025-10-06' },
        { name: '《sectl的构成》.png', pushDate: '2026-02-28' },
        { name: '114种🌞本新的方法-1.png', pushDate: '2025-10-25' },
        { name: '114种🌞本新的方法-2.png', pushDate: '2025-10-25' },
        { name: '爱什么？我们一个群男生啊.png', pushDate: '2026-02-08' },
        { name: '安能辨我是雄雌.jpg', pushDate: '2026-03-04' },
        { name: '傲娇藏狐哈气了.jpg', pushDate: '2026-01-18' },
        { name: '傲娇猫猫哈气了.png', pushDate: '2025-08-20' },
        { name: '傲娇起来了.jpg', pushDate: '2026-02-01' },
        { name: '霸道黎总和他的qq数字小娇妻（？）.png', pushDate: '2026-02-24' },
        { name: '被爱到力竭的藏狐驾鹤西去了.png', pushDate: '2026-02-08' },
        { name: '被逼疯的生物.png', pushDate: '2025-08-26' },
        { name: '被威胁了就眨眼.png', pushDate: '2025-08-17' },
        { name: '被Pro价钱惊呆的丙烯.jpg', pushDate: '2026-02-01' },
        { name: '本群认证猫娘cjt，严禁模仿.jpg', pushDate: '2026-02-01' },
        { name: '本新：我还活着.png', pushDate: '2025-08-29' },
        { name: '本新：要不我给实例装个桌面环境.jpg', pushDate: '2026-02-01' },
        { name: '本新的出场动作真帅.png', pushDate: '2025-10-25' },
        { name: '本新对刘将军史诗巨作的评价.png', pushDate: '2025-08-22' },
        { name: '本新名言.png', pushDate: '2025-10-25' },
        { name: '本新是人机？！.png', pushDate: '2025-08-20' },
        { name: '病娇本新.png', pushDate: '2026-01-16' },
        { name: '病娇三连.jpg', pushDate: '2026-02-01' },
        { name: '不知道谁写的史山.png', pushDate: '2025-08-23' },
        { name: '藏狐：跟我家抢生意？.png', pushDate: '2026-02-08' },
        { name: '藏狐：我踏马，作业起爆！！.png', pushDate: '2025-10-03' },
        { name: '藏狐：吱吱.png', pushDate: '2025-11-22' },
        { name: '藏狐宝贵的第一次.png', pushDate: '2025-08-24' },
        { name: '藏狐不管了.jpg', pushDate: '2026-03-07' },
        { name: '藏狐藏狐，我爱你，就像老鼠爱大米（）.png', pushDate: '2026-02-08' },
        { name: '藏狐的花言巧语馁，真（不）可爱😋.png', pushDate: '2026-02-26' },
        { name: '藏狐的孽缘.png', pushDate: '2026-03-01' },
        { name: '藏狐的挑担就是好用.png', pushDate: '2025-11-15' },
        { name: '藏狐黑化ing.png', pushDate: '2025-08-16' },
        { name: '藏狐叫了.png', pushDate: '2025-08-23' },
        { name: '藏狐进山.png', pushDate: '2025-08-23' },
        { name: '藏狐你是有什么心事吗.jpg', pushDate: '2026-02-01' },
        { name: '藏狐是…（？）.png', pushDate: '2026-02-26' },
        { name: '藏狐是女同（bushi.png', pushDate: '2026-02-26' },
        { name: '藏狐自己养异世界の藏狐.png', pushDate: '2025-08-17' },
        { name: '藏狐の白白嫩嫩的身体.png', pushDate: '2025-11-09' },
        { name: '藏壶.png', pushDate: '2026-02-23' },
        { name: '茶馆馆主带头喝茶.png', pushDate: '2025-08-18' },
        { name: '打包大蛇.png', pushDate: '2026-01-11' },
        { name: '打工人怒吼没钱.jpg', pushDate: '2026-02-01' },
        { name: '大型🤖养殖场（雾）.png', pushDate: '2025-08-26' },
        { name: '大型嚼茶现场.png', pushDate: '2025-08-18' },
        { name: '大SECTL帝国.png', pushDate: '2026-02-28' },
        { name: '倒反天罡，这机器人到底学到了什么奇怪东西.png', pushDate: '2025-10-04' },
        { name: '地府苦力怕？.png', pushDate: '2026-02-08' },
        { name: '等离子藏狐炮，砰！.png', pushDate: '2025-10-02' },
        { name: '叠字大狮.png', pushDate: '2025-10-03' },
        { name: '东北粗口.png', pushDate: '2025-08-16' },
        { name: '东北方言.png', pushDate: '2025-08-17' },
        { name: '都是文明人.jpg', pushDate: '2026-02-01' },
        { name: '诶嘿.jpg', pushDate: '2026-03-01' },
        { name: '发情的输入法.png', pushDate: '2025-08-17' },
        { name: '方言狐.png', pushDate: '2025-08-23' },
        { name: '飞什么过去.png', pushDate: '2026-02-26' },
        { name: '干净利索，不拖泥带水.png', pushDate: '2025-12-16' },
        { name: '淦亖你啊.png', pushDate: '2025-08-16' },
        { name: '高端优雅的点名动画.png', pushDate: '2025-08-22' },
        { name: '革命夫妻.jpg', pushDate: '2026-04-05' },
        { name: '给藏狐调成啥了.jpg', pushDate: '2026-02-01' },
        { name: '给虾哥点上.png', pushDate: '2025-11-28' },
        { name: '官方吐槽.png', pushDate: '2025-10-11' },
        { name: '官方玩梗，最为致命.png', pushDate: '2026-02-08' },
        { name: '还有高手.png', pushDate: '2026-02-08' },
        { name: '河里.jpg', pushDate: '2026-02-01' },
        { name: '很好的问题.png', pushDate: '2025-10-11' },
        { name: '很精准的翻译.png', pushDate: '2025-08-20' },
        { name: '狐狸狐狸我爱你.png', pushDate: '2026-02-08' },
        { name: '狐言狐语.jpg', pushDate: '2026-02-01' },
        { name: '狐言乱语，秦王迷惑.png', pushDate: '2025-08-17' },
        { name: '幻想OS.png', pushDate: '2025-08-23' },
        { name: '婚戒成就.png', pushDate: '2025-08-26' },
        { name: '机械飞升，但是得插电.png', pushDate: '2025-10-05' },
        { name: '结合上下文，不难得出黎泽懿是（）控.png', pushDate: '2025-11-09' },
        { name: '今年过年奖品真多，这只狐狸包邮吗.png', pushDate: '2026-02-08' },
        { name: '经典咏流传.png', pushDate: '2026-02-24' },
        { name: '惊现m开发者，竟让机器人做出这种事情....png', pushDate: '2025-10-25' },
        { name: '开学后生命的转折点.png', pushDate: '2025-08-18' },
        { name: '看得出来很爱了.png', pushDate: '2026-02-08' },
        { name: '科技感分黎泽懿.png', pushDate: '2026-02-08' },
        { name: '狂狐日记.jpg', pushDate: '2026-03-21' },
        { name: '来自姜胤の赞赏.png', pushDate: '2026-01-15' },
        { name: '牢黎的吐槽.jpg', pushDate: '2026-02-01' },
        { name: '牢虾与黎泽懿的吉列豆蒸.png', pushDate: '2025-11-25' },
        { name: '黎大夫妙手回春啊.png', pushDate: '2025-10-25' },
        { name: '黎萌懿：我踏马一点也不好.jpg', pushDate: '2026-02-18' },
        { name: '黎萌懿你别死了.jpg', pushDate: '2026-02-18' },
        { name: '黎泽懿：合着我™必须要早恋是吧.png', pushDate: '2026-03-03' },
        { name: '黎泽懿：你来~.png', pushDate: '2025-10-07' },
        { name: '黎泽懿：卫生巾这梗过不去了是吧.png', pushDate: '2025-10-04' },
        { name: '黎泽懿：医药费不支持报销.jpg', pushDate: '2026-02-01' },
        { name: '黎泽懿不行啊，怎么冷却时间这么长啊~~.png', pushDate: '2025-10-25' },
        { name: '黎泽懿是AI做的.png', pushDate: '2025-11-08' },
        { name: '黎泽懿滞销.png', pushDate: '2025-08-16' },
        { name: '翎想要啦（嘿嘿）.jpg', pushDate: '2026-03-29' },
        { name: '翎想要啦🥵.jpg', pushDate: '2026-03-29' },
        { name: '龙尊本色.jpeg', pushDate: '2025-08-16' },
        { name: '满足你的愿望.png', pushDate: '2026-02-18' },
        { name: '冒烟的撤回键.png', pushDate: '2025-08-26' },
        { name: '没有藏狐，满满的都是幸福.png', pushDate: '2025-11-09' },
        { name: '没有什么插？！.png', pushDate: '2025-08-29' },
        { name: '秒商店开仓老观众.png', pushDate: '2025-08-19' },
        { name: '你管？.png', pushDate: '2025-08-17' },
        { name: '你好，泽懿.jpg', pushDate: '2026-02-01' },
        { name: '你好刘同学.png', pushDate: '2025-08-22' },
        { name: '你妈比的！.png', pushDate: '2025-08-16' },
        { name: '你想象中的黎泽懿何必是黎泽懿.png', pushDate: '2025-08-23' },
        { name: '你知道教你这一段，我把笔甩出去多少次吗.png', pushDate: '2025-11-26' },
        { name: '你指的不是Gay，对吧.png', pushDate: '2026-02-08' },
        { name: '你最好在说gun，而不是别的东西...png', pushDate: '2025-10-02' },
        { name: '偶然相遇.png', pushDate: '2025-10-25' },
        { name: '勤俭持家の狐.jpg', pushDate: '2026-02-01' },
        { name: '请读者自行想象此画面，SECTL不作任何指导.png', pushDate: '2025-11-16' },
        { name: '请群友们注意卫生，勿效仿口臭XXS.png', pushDate: '2025-09-14' },
        { name: '请输入文本.png', pushDate: '2025-11-26' },
        { name: '群主很忙.png', pushDate: '2025-10-03' },
        { name: '群主认证_70.png', pushDate: '2025-08-24' },
        { name: '群主认证_85.png', pushDate: '2025-08-24' },
        { name: '群主认证.png', pushDate: '2025-08-24' },
        { name: '群主认证的男娘.png', pushDate: '2025-08-24' },
        { name: '群主是一种性取向.png', pushDate: '2026-02-08' },
        { name: '群主说话显得自己很憨.png', pushDate: '2025-08-17' },
        { name: '群主最好玩.png', pushDate: '2025-10-11' },
        { name: '让藏狐成为更好的自己，加98号汽油！.jpg', pushDate: '2026-02-26' },
        { name: '让我回哪里去？？.png', pushDate: '2025-08-17' },
        { name: '热知识：那玩意指雌二醇.png', pushDate: '2026-02-08' },
        { name: '人机也懂，看来确实不是滋味_14.png', pushDate: '2025-10-06' },
        { name: '人机也懂，看来确实不是滋味.png', pushDate: '2025-10-06' },
        { name: '人与bot大型互殴现场.png', pushDate: '2025-08-21' },
        { name: '如何跟领导混熟_76.png', pushDate: '2025-10-18' },
        { name: '入典.png', pushDate: '2025-08-16' },
        { name: '赛博灯泡.png', pushDate: '2025-10-06' },
        { name: '啥情况.jpg', pushDate: '2026-03-15' },
        { name: '烧纸ing.png', pushDate: '2026-02-08' },
        { name: '设置班级.png', pushDate: '2025-11-01' },
        { name: '身体暖暖的东西.png', pushDate: '2025-08-23' },
        { name: '师父别说了.jpg', pushDate: '2026-02-01' },
        { name: '双重妈比.png', pushDate: '2025-08-16' },
        { name: '说明黎泽懿是….png', pushDate: '2025-12-13' },
        { name: '思 想 风 暴.png', pushDate: '2025-08-23' },
        { name: '螳螂捕蝉SECTL在后.png', pushDate: '2026-02-28' },
        { name: '体毛茂盛的龙娘.png', pushDate: '2026-01-27' },
        { name: '童言无忌.png', pushDate: '2025-08-29' },
        { name: '拖出去斩了.png', pushDate: '2025-08-16' },
        { name: '我↗cnm↘️.png', pushDate: '2026-03-02' },
        { name: '我爱你.png', pushDate: '2026-02-08' },
        { name: '我不管.png', pushDate: '2025-08-16' },
        { name: '我服了.png', pushDate: '2026-02-28' },
        { name: '我后台软件应该不多吧.png', pushDate: '2025-09-20' },
        { name: '我叫你一声你敢答应吗.png', pushDate: '2025-11-26' },
        { name: '我们不认黎泽懿，我们忠于SECTL.png', pushDate: '2026-03-01' },
        { name: '我这个级别的cjt有权利哈任何人.png', pushDate: '2026-01-27' },
        { name: '吸藏狐.png', pushDate: '2025-09-20' },
        { name: '喜欢被霸.png', pushDate: '2025-08-17' },
        { name: '香香软软…….png', pushDate: '2025-10-11' },
        { name: '香香软软吹弹可破的藏狐_85.png', pushDate: '2025-08-23' },
        { name: '香香软软吹弹可破的藏狐.png', pushDate: '2025-08-23' },
        { name: '香香软软群主.png', pushDate: '2025-08-23' },
        { name: '小飞侠彼得·泽懿·潘.png', pushDate: '2025-11-09' },
        { name: '小毛毛群主.png', pushDate: '2025-08-23' },
        { name: '小小小小小藏狐.png', pushDate: '2025-08-16' },
        { name: '嘘，小点声.png', pushDate: '2026-02-08' },
        { name: '雪野狐是男娘！（被打死）.png', pushDate: '2026-03-21' },
        { name: '叶背影：请输入文本.png', pushDate: '2026-02-18' },
        { name: '一世阴名.png', pushDate: '2025-08-17' },
        { name: '已抄送藏狐本人，他拒绝了Gay.png', pushDate: '2026-02-08' },
        { name: '意义美好的英文.png', pushDate: '2025-08-23' },
        { name: '永远怀念黎泽懿.png', pushDate: '2026-03-01' },
        { name: '有盒同享.png', pushDate: '2025-08-17' },
        { name: '又一个写代码疯了的.png', pushDate: '2026-02-08' },
        { name: '粤韵风华.png', pushDate: '2025-08-16' },
        { name: '杂交龙娘，香香软软.png', pushDate: '2025-08-23' },
        { name: '再发情让你飞起来.png', pushDate: '2026-02-08' },
        { name: '再盒就是盒装饮料了.png', pushDate: '2025-08-21' },
        { name: '在某中学就读的初三生.png', pushDate: '2025-11-08' },
        { name: '长易句.png', pushDate: '2025-08-22' },
        { name: '招魂.png', pushDate: '2026-02-08' },
        { name: '这个能播吗.png', pushDate: '2026-02-08' },
        { name: '这话不兴说啊.jpg', pushDate: '2026-02-01' },
        { name: '这事说不准.png', pushDate: '2025-10-25' },
        { name: '这ai没救了.png', pushDate: '2026-02-18' },
        { name: '珍贵回忆.png', pushDate: '2025-08-16' },
        { name: '震撼首发：QQ根据黎泽懿的照片生成的QQ秀.png', pushDate: '2026-03-01' },
        { name: '只有精没有华消息.png', pushDate: '2025-08-18' },
        { name: '拽拽的黎泽懿.png', pushDate: '2025-11-09' },
        { name: '作业滞销，帮帮黎泽懿.png', pushDate: '2025-08-20' },
        { name: 'AI调用AI.png', pushDate: '2026-03-01' },
        { name: 'CJK女装😋.jpg', pushDate: '2026-02-20' },
        { name: 'CJT的第一次......全身照.png', pushDate: '2025-11-08' },
        { name: 'Deepthinking.png', pushDate: '2025-08-16' },
        { name: 'Follow me！龙娘姐↓姐↑~~~.png', pushDate: '2025-10-02' },
        { name: 'Fox直播.jpg', pushDate: '2026-02-01' },
        { name: 'Grok-SECTL纯享版.png', pushDate: '2025-08-18' },
        { name: 'i 何懿味.png', pushDate: '2025-10-11' },
        { name: 'learn dam.png', pushDate: '2025-11-08' },
        { name: 'Loading....cute藏狐.png', pushDate: '2026-02-03' },
        { name: 'lrs2187第二次露出手手.jpg', pushDate: '2026-02-03' },
        { name: 'lrs2187首次露手.jpg', pushDate: '2026-02-03' },
        { name: 'O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A- JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA.png', pushDate: '2025-08-17' },
        { name: 'pH大于12.png', pushDate: '2025-08-23' },
        { name: 'SECTL官方白骨精.png', pushDate: '2025-10-11' },
        { name: 'SECTL官方认证的白骨精.png', pushDate: '2025-10-11' },
        { name: 'sectlmiao.png', pushDate: '2025-08-20' },
        { name: 'Star保卫战.png', pushDate: '2025-11-08' },
        { name: 'Super黎泽懿.png', pushDate: '2025-10-02' },
        { name: 'xwei 是谁🥵不认识.jpg', pushDate: '2026-02-25' },
        { name: 'Xwei我喜欢你.png', pushDate: '2026-01-01' }
      ];
    }
    
    // 排序图片（按名称）
    imageList.sort((a, b) => {
      const nameA = formatImageName(a).toLowerCase();
      const nameB = formatImageName(b).toLowerCase();
      return nameA.localeCompare(nameB, 'zh-CN');
    });
    
    images.value = imageList;
    
    await nextTick();
    const containerWidth = getContainerWidth();
    const columnsCount = computeColumnCount(containerWidth);
    columnCount.value = columnsCount;
    const initialCount = computeInitialVisibleCount(columnsCount);
    const initialImages = images.value.slice(0, initialCount);
    displayedImages.value = [...initialImages];
    
    // 初始化加载状态
    displayedImages.value.forEach(image => {
      const key = getImageKey(image);
      imageLoaded.value[key] = false;

      if (!imageTimeouts.has(key)) {
        const timeoutId = setTimeout(() => {
          if (imageLoaded.value[key] === false) {
            imageLoaded.value[key] = true;
          }
          imageTimeouts.delete(key);
        }, 8000);
        imageTimeouts.set(key, timeoutId);
      }
    });
    
    distributeImagesToColumns();

    schedule(() => preloadImages(displayedImages.value, 8));
    
  } catch (error) {
    images.value = [];
  } finally {
    loading.value = false;
    nextTick(() => setupLoadMore());
  }
};

// 重新加载图片列表
const reloadImages = async () => {
  displayedImages.value = [];
  loadedCount.value = 0;
  imageLoaded.value = {};
  columns.value = [];
  await fetchImages();
};

let loadMoreObserver = null;
let resizeObserver = null;
let loadMoreInterval = null;

const setupLoadMore = () => {
  window.removeEventListener('scroll', handleScroll);
  if (loadMoreObserver) {
    loadMoreObserver.disconnect();
    loadMoreObserver = null;
  }

  if ('IntersectionObserver' in window) {
    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreImages();
      },
      { rootMargin: '800px 0px' }
    );

    if (loadMoreSentinel.value) {
      loadMoreObserver.observe(loadMoreSentinel.value);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  if (isSentinelInLoadRange()) loadMoreImages();
};

// 组件生命周期
onMounted(() => {
  fetchImages();

  nextTick(() => {
    setupLoadMore();
    distributeImagesToColumns();

    if ('ResizeObserver' in window && masonryContainer.value) {
      resizeObserver = new ResizeObserver(() => distributeImagesToColumns());
      resizeObserver.observe(masonryContainer.value);
    } else {
      window.addEventListener('resize', distributeImagesToColumns);
    }

    if (loadMoreInterval) {
      clearInterval(loadMoreInterval);
      loadMoreInterval = null;
    }
    loadMoreInterval = setInterval(() => {
      if (!isLoading.value && displayedImages.value.length < images.value.length && isSentinelInLoadRange()) {
        loadMoreImages();
      }
      if (displayedImages.value.length >= images.value.length) {
        clearInterval(loadMoreInterval);
        loadMoreInterval = null;
      }
    }, 500);
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', distributeImagesToColumns);
  if (loadMoreInterval) {
    clearInterval(loadMoreInterval);
    loadMoreInterval = null;
  }

  if (loadMoreObserver) {
    loadMoreObserver.disconnect();
    loadMoreObserver = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  for (const timeoutId of imageTimeouts.values()) clearTimeout(timeoutId);
  imageTimeouts.clear();
});
</script>

<style scoped>
/* 主容器样式 */
.masonry-gallery {
  padding: 40px 40px; 
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  display: grid;
}

/* 加载占位符 */
.loading-placeholder {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.placeholder-card {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fadeOut { 
  from { opacity: 1; visibility: visible; }
  to { opacity: 0; visibility: hidden; }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 120px 40px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 20px;
  margin: 40px auto;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 30px;
  opacity: 0.7;
  animation: float 3s ease-in-out infinite;
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.empty-title {
  font-size: 1.8rem;
  margin-bottom: 15px;
  color: #2c3e50;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.empty-description {
  color: #6c757d;
  margin-bottom: 40px;
  font-size: 1.1rem;
  line-height: 1.6;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-subtitle {
  color: #8e959d;
  font-size: 0.95rem;
  margin-bottom: 25px;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
}

.refresh-btn,
.scan-btn {
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 140px;
}

.refresh-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.scan-btn {
  background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(86, 171, 47, 0.4);
}

.refresh-btn:hover,
.scan-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.refresh-btn:active,
.scan-btn:active {
  transform: translateY(-1px);
}

.refresh-btn::before,
.scan-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.refresh-btn:hover::before,
.scan-btn:hover::before {
  left: 100%;
}

.refresh-btn.small,
.scan-btn.small {
  padding: 10px 20px;
  font-size: 0.9rem;
  min-width: 120px;
}

.empty-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 25px 0;
  flex-wrap: wrap;
}

.empty-stat {
  text-align: center;
}

.empty-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  display: block;
}

.empty-stat-label {
  font-size: 0.85rem;
  color: #8e959d;
  margin-top: 5px;
}

/* 信息卡片 */
.gallery-info {
  margin-bottom: 30px;
}

.info-card {
  background: var(--color-bg-soft);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.info-item {
  font-size: 1.1rem;
}

/* 智能瀑布流布局 */
.masonry-container {
  width: 100%;
  display: flex;
  gap: 25px;
  max-width: 100%;
  margin: 0;
  justify-content: flex-start;
  align-items: flex-start;
}

.masonry-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.masonry-item {
  margin-bottom: 20px;
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
  content-visibility: auto;
  contain-intrinsic-size: 320px 480px;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.masonry-card {
  background: var(--color-bg-card);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all var(--duration-normal) var(--ease-out);
  cursor: pointer;
  border: 1px solid var(--color-border-light);
}

.masonry-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-hover);
}

/* 图片容器 */
.card-image-container {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-soft);
  max-height: 520px;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  border-radius: 12px 12px 0 0;
}

.masonry-card:hover .card-image {
  transform: scale(1.05);
}

.card-image-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--color-bg-soft) 0%, var(--color-bg-mute) 25%, var(--color-bg-soft) 50%, var(--color-bg-mute) 75%, var(--color-bg-soft) 100%);
  background-size: 200% 200%;
  animation: loading 2s ease-in-out infinite;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 10;
}

.card-image-loading::before {
  content: '';
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (max-width: 640px) {
  .card-image-loading::before {
    width: 32px;
    height: 32px;
    border-width: 2px;
  }
}

@media (max-width: 400px) {
  .card-image-loading::before {
    width: 28px;
    height: 28px;
  }
}

.card-image-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 1.5s infinite;
}

/* 内容区域 */
.card-content {
  padding: 16px;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  word-break: break-word;
}

.card-meta {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.type-badge,
.index-badge {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--color-bg-mute);
  color: var(--color-text-soft);
  font-weight: 600;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border-light);
  white-space: nowrap;
  flex-shrink: 0;
}

.type-badge {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #90caf9;
}

.type-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
}

.date-badge {
  background: #e8f4fd;
  color: #0288d1;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  box-shadow: 0 1px 2px rgba(2, 136, 209, 0.1);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid #b3e5fc;
}

.date-badge::before {
  content: '📅';
  font-size: 0.6rem;
}

.date-badge:hover {
  background: #b3e5fc;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(2, 136, 209, 0.2);
}

.index-badge {
  background: #f3e5f5;
  color: #7b1fa2;
  border-color: #ce93d8;
}

.index-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(123, 31, 162, 0.2);
}

/* 加载更多 */
.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: #666;
}

.load-more-sentinel {
  width: 100%;
  height: 1px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f0f0f0;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .masonry-gallery {
    padding: 10px 8px;
    margin: 0;
    max-width: none;
    width: 100%;
  }
  
  .masonry-container {
    gap: 10px;
  }
  
  .masonry-item {
    margin-bottom: 10px;
  }
  
  .card-content {
    padding: 12px;
  }
  
  .card-title {
    font-size: 0.9rem;
  }
  
  .date-badge,
  .type-badge,
  .index-badge {
    font-size: 0.6rem;
    padding: 1px 4px;
    border-radius: 6px;
    gap: 1px;
  }
  
  .date-badge::before {
    font-size: 0.55rem;
  }
  
  .card-meta {
    gap: 4px;
  }
}

@media (max-width: 400px) {
  .date-badge,
  .type-badge,
  .index-badge {
    font-size: 0.55rem;
    padding: 1px 3px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .masonry-container {
    gap: 15px;
  }
  
  .masonry-item {
    margin-bottom: 15px;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .masonry-card {
    background: #1e1e1e;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .card-title {
    color: #e0e0e0;
  }
  
  .type-badge {
    background: #1565c0;
    color: white;
  }
  
  .index-badge {
    background: #7b1fa2;
    color: white;
  }
}
</style>
