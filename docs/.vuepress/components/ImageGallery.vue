<template>
  <div class="image-gallery">
    <!-- 加载占位组件 -->
    <div v-if="loading && images.length === 0" class="gallery-placeholder">
      <div class="placeholder-header">
        <div class="placeholder-shimmer"></div>
        <div class="placeholder-text">图片加载中...</div>
      </div>
      <div class="placeholder-masonry">
        <div 
          v-for="i in 8" 
          :key="i" 
          class="placeholder-item"
          :style="{ height: getRandomHeight(20, 800) + 'px' }"
        >
          <div class="placeholder-image shimmer"></div>
        </div>
      </div>
    </div>
    
    <!-- 空状态占位组件 -->
    <div v-else-if="images.length === 0" class="gallery-empty-placeholder">
      <div class="empty-icon">📷</div>
      <div class="empty-title">暂无图片</div>
      <div class="empty-description">请检查图片文件是否存在</div>
    </div>
    
    <!-- 瀑布流容器 -->
    <div v-else class="masonry-container" ref="masonryContainer">
      <div 
        class="masonry-column"
        v-for="(column, columnIndex) in columns"
        :key="columnIndex"
      >
        <div 
          v-for="(image, index) in column"
          :key="image + '-' + index"
          class="masonry-item"
          :style="{ 
            height: getImageHeight(image) + 'px',
            animationDelay: (index * 0.1) + 's'
          }"
        >
          <div class="image-name">{{ formatImageName(image) }}</div>
          <div 
            class="image-container"
            :class="{ loaded: imageLoaded[image] }"
          >
            <img 
              :src="getImageUrl(image)" 
              :alt="image" 
              loading="lazy" 
              @load="handleImageLoad($event, image, columnIndex)"
              @error="handleImageError($event, image)"
            />
            <!-- 图片加载占位符 -->
            <div class="image-placeholder" v-if="!imageLoaded[image]">
              <div class="placeholder-icon">📷</div>
              <div class="placeholder-text">加载中...</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载更多占位符 -->
      <div v-if="loadingMore" class="loading-more">
        <div class="loading-spinner"></div>
        <span>正在加载更多...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';

// 状态变量
const loading = ref(true);
const loadingMore = ref(false);
const images = ref([]);
const displayedImages = ref([]);
const failedImages = ref([]);
const imageLoaded = ref({});
const loadedCount = ref(0);
const columns = ref([]);
const masonryContainer = ref(null);

// 瀑布流配置
const columnCount = ref(3);
const columnHeights = ref([]);
const batchSize = 12;
const currentBatch = ref(0);
const isLoading = ref(false);

// 图片高度映射（模拟不同尺寸的图片）
const imageHeights = ref({});

// 图片真实宽高比映射
const imageAspectRatios = ref({});

// 格式化图片名称
const formatImageName = (filename) => {
  const decodedName = decodeURIComponent(filename);
  const nameWithoutExt = decodedName.split('.').slice(0, -1).join('.');
  return nameWithoutExt;
};

// 获取图片URL
const getImageUrl = (filename) => {
  return `/images/${encodeURIComponent(filename)}`;
};

// 生成随机高度用于占位符
const getRandomHeight = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 为每张图片分配高度 - 完全基于真实宽高比，无限制
const getImageHeight = (image) => {
  if (!imageHeights.value[image]) {
    let aspectRatio = 4 / 3; // 默认宽高比
    
    // 如果已存储真实宽高比，则使用它
    if (imageAspectRatios.value[image]) {
      aspectRatio = imageAspectRatios.value[image];
    }
    
    // 计算当前容器宽度
    const containerWidth = (masonryContainer.value?.offsetWidth || 3000) / Math.max(columnCount.value, 1) - 32;
    const estimatedHeight = containerWidth / aspectRatio;
    
    // 添加标题区域和间距，无高度限制
    const titleHeight = 50;
    const gap = getGapValue();
    imageHeights.value[image] = Math.round(estimatedHeight) + titleHeight + gap;
  }
  return imageHeights.value[image];
};

// 计算响应式列数 - 优化全设备适配
const calculateColumns = () => {
  const width = window.innerWidth;
  
  // 超宽屏支持
  if (width >= 1921) return 6;
  if (width >= 1600) return 5;
  if (width >= 1200) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  if (width >= 640) return 1; // 手机大屏
  if (width >= 480) return 1; // 手机标准
  return 1; // 超小屏
};

// 获取间距值 - 简化为固定值，避免CSS变量依赖
const getGapValue = () => {
  const width = window.innerWidth;
  if (width >= 768) return 16; // 桌面端
  if (width >= 480) return 12; // 平板端
  return 8; // 手机端
};

// 重新分配图片到列 - 使用动态计算的列数
const distributeImages = (imagesToDistribute) => {
  const currentColumnCount = calculateColumns(); // 直接使用JavaScript计算的列数
  const newColumns = Array.from({ length: currentColumnCount }, () => []);
  const newHeights = Array.from({ length: currentColumnCount }, () => 0);
  
  imagesToDistribute.forEach(image => {
    // 智能选择最短列，确保图片自动填补空白
    let shortestColumnIndex = 0;
    let minHeight = newHeights[0];
    
    // 精确找到最短列
    for (let i = 1; i < newHeights.length; i++) {
      if (newHeights[i] < minHeight) {
        minHeight = newHeights[i];
        shortestColumnIndex = i;
      }
    }
    
    newColumns[shortestColumnIndex].push(image);
    
    // 使用实际计算的高度进行布局
    const imageHeight = imageHeights.value[image] || getImageHeight(image);
    const gap = getGapValue(); // 使用动态间距
    newHeights[shortestColumnIndex] += imageHeight + gap;
  });
  
  columnHeights.value = newHeights;
  columns.value = newColumns;
  columnCount.value = currentColumnCount;
};

// 加载下一批图片
const loadMoreImages = async () => {
  if (isLoading.value || currentBatch.value * batchSize >= images.value.length) return;
  
  isLoading.value = true;
  loadingMore.value = true;
  
  const startIndex = currentBatch.value * batchSize;
  const endIndex = Math.min(startIndex + batchSize, images.value.length);
  const newImages = images.value.slice(startIndex, endIndex);
  
  // 延迟加载以展示加载动画
  await new Promise(resolve => setTimeout(resolve, 800));
  
  displayedImages.value.push(...newImages);
  distributeImages(displayedImages.value);
  
  currentBatch.value++;
  isLoading.value = false;
  loadingMore.value = false;
};

// 处理图片加载
const handleImageLoad = (event, image, columnIndex) => {
  imageLoaded.value[image] = true;
  loadedCount.value++;
  
  // 使用图片真实宽高比计算高度，无限制显示
  const img = event.target;
  const actualHeight = img.naturalHeight;
  const actualWidth = img.naturalWidth;
  
  if (actualHeight > 0 && actualWidth > 0) {
    // 存储真实宽高比
    imageAspectRatios.value[image] = actualWidth / actualHeight;
    
    // 严格按照原始宽高比计算高度，无高度限制
    const containerWidth = (masonryContainer.value?.offsetWidth || 3000) / columnCount.value - 32;
    const calculatedHeight = containerWidth / imageAspectRatios.value[image];
    
    // 计算完整高度（包含标题和间距）
    const titleHeight = 50;
    const gap = getGapValue();
    const totalHeight = Math.round(calculatedHeight) + titleHeight + gap;
    
    // 更新为基于真实宽高比的高度
    imageHeights.value[image] = totalHeight;
    
    // 重新布局以应用真实尺寸
    nextTick(() => {
      distributeImages(displayedImages.value);
    });
  }
};

// 处理图片加载错误
const handleImageError = (event, image) => {
  console.error(`图片加载失败: ${image}`);
  failedImages.value.push(image);
  imageLoaded.value[image] = true;
  loadedCount.value++;
};

// 滚动加载更多
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  
  if (scrollTop + windowHeight >= documentHeight - 100) {
    loadMoreImages();
  }
};



// 获取图片列表
const fetchImages = async () => {
  loading.value = true;
  
  try {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const builtinImages = [
      '（把藏狐绑起来）.png',
      '(拿出绳子,一把捆住藏狐).png',
      '藏狐黑化ing.png',
      '东北粗口.png',
      '淦亖你啊.png',
      '黎泽懿滞销.png',
      '龙尊本色.jpeg',
      '你妈比的！.png',
      '入典.png',
      '双重妈比.png',
      '拖出去斩了.png',
      '我不管.png',
      '喜欢被霸.png',
      '小小小小小藏狐.png',
      '粤韵风华.png',
      '珍贵回忆.png',
      'Deepthinking.png'
    ];
    
    const validImages = builtinImages.filter(filename => {
      const extension = filename.split('.').pop()?.toLowerCase();
      return extension && imageExtensions.includes(extension);
    });
    
    const uniqueImages = [...new Set(validImages)].sort((a, b) => 
      a.localeCompare(b, 'zh-CN', { sensitivity: 'base' })
    );
    
    images.value = uniqueImages;
    
    // 初始化加载状态
    imageLoaded.value = {};
    images.value.forEach(img => {
      imageLoaded.value[img] = false;
    });
    
    loadedCount.value = 0;
    
    // 加载第一批图片
    loadMoreImages();
    
  } catch (error) {
    console.error('获取图片列表失败:', error);
    images.value = [];
  } finally {
    loading.value = false;
  }
};

// 监听列数变化
watch(columnCount, () => {
  nextTick(() => {
    distributeImages(displayedImages.value);
  });
});

// 强制重新布局 - 基于真实图片尺寸的空白填补
const forceReLayout = () => {
  nextTick(() => {
    const allImages = displayedImages.value;
    
    // 重新计算所有图片的高度，使用最新的容器宽度和真实宽高比
    allImages.forEach(image => {
      // 无论是否加载，都重新计算以适应新的容器宽度
      getImageHeight(image);
    });
    
    // 重新分配所有图片到列中，确保空白被正确填补
    distributeImages(allImages);
  });
};



// 监听窗口大小变化，优化性能
const handleResize = () => {
  // 使用防抖来优化性能
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    const newColumnCount = calculateColumns();
    if (newColumnCount !== columnCount.value) {
      columnCount.value = newColumnCount;
    }
    
    // 无论列数是否变化，都重新布局以确保空白被正确填补
    forceReLayout();
  }, 150);
};

// 监听CSS变量变化
const observeCSSVariables = () => {
  const observer = new MutationObserver(() => {
    const currentColumnCount = getCSSVariable('--masonry-columns');
    if (currentColumnCount !== columnCount.value) {
      columnCount.value = currentColumnCount;
      distributeImages(displayedImages.value);
    }
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style']
  });
  
  return observer;
};

// 组件生命周期
onMounted(() => {
  fetchImages();
  
  // 监听滚动和窗口变化
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  
  // 初始计算列数
  columnCount.value = calculateColumns();
  
  // 监听CSS变量变化
  const cssObserver = observeCSSVariables();
  
  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    cssObserver.disconnect();
    clearTimeout(window.resizeTimeout);
  });
});
</script>

<style scoped>
/* 主容器样式 */
.image-gallery {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
  min-height: 50vh;
}

/* 瀑布流容器 */
.masonry-container {
  width: 100%;
  max-width: 3000px;
  margin: 0 auto;
  position: relative;
  display: flex;
  gap: var(--masonry-gap, 1rem);
  align-items: flex-start;
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--masonry-gap, 1rem);
  min-width: 0;
  width: calc(100% / var(--masonry-columns, 3));
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.masonry-item {
  margin-bottom: var(--masonry-gap, 1rem);
  border-radius: var(--masonry-item-radius, 12px);
  overflow: hidden;
  box-shadow: var(--masonry-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  width: 100%;
  animation: slideIn 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
  position: relative;
}

.masonry-item:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--masonry-shadow-hover, 0 8px 25px rgba(0, 0, 0, 0.25));
  border-color: var(--vp-c-brand);
}

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 图片容器 */
.image-container {
  position: relative;
  width: 100%;
  background-color: var(--vp-c-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  margin: 0;
  padding: 0;
}

.image-container img {
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  transition: opacity 0.3s ease, transform 0.3s ease;
  margin: 0;
  padding: 0;
}

.image-container.loaded img {
  opacity: 1;
}

.image-container:not(.loaded) img {
  opacity: 0;
}

/* 图片名称 */
.image-name {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text);
  background: linear-gradient(to bottom, var(--vp-c-bg), var(--vp-c-bg-soft));
  margin: 0;
  line-height: 1.4;
  min-height: 2.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-word;
  overflow: visible;
  white-space: normal;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
}

.masonry-item:hover .image-name {
  background: linear-gradient(to bottom, var(--vp-c-bg-soft), var(--vp-c-bg-mute));
  color: var(--vp-c-brand);
}

/* 加载占位符 */
.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  z-index: 1;
  margin: 0;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 0.875rem;
  opacity: 0.5;
}

/* 占位组件样式 */
.gallery-placeholder {
  width: 100%;
  max-width: 3000px;
  margin: 0 auto;
  padding: 1rem 50px; /* 减小左右间距到50px */
  box-sizing: border-box;
}

.placeholder-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.placeholder-shimmer {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.placeholder-masonry {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.placeholder-item {
  flex: 1;
  min-width: 250px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  position: relative;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f5f5f5 25%, #e8e8e8 50%, #f5f5f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* 空状态样式 */
.gallery-empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--vp-c-bg);
  border-radius: 12px;
  border: 2px dashed var(--vp-c-divider);
  margin: 2rem auto;
  max-width: 500px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text);
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 1rem;
  color: #888;
  max-width: 300px;
  line-height: 1.5;
}

/* 加载更多 */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 1rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--vp-c-divider);
  border-top: 2px solid var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer {
  animation: shimmer 1.5s infinite;
}

/* 响应式设计 - 全面优化移动端体验 */

/* 超宽屏 (4K+) */
@media (min-width: 1921px) {
  :root {
    --masonry-columns: 6;
    --masonry-gap: 1.5rem;
  }
  
  .masonry-container {
    max-width: 1800px;
  }
}

/* 桌面端大屏 */
@media (max-width: 1920px) {
  :root {
    --masonry-columns: 5;
  }
}

@media (max-width: 1600px) {
  :root {
    --masonry-columns: 4;
  }
}

/* 桌面端标准 */
@media (max-width: 1200px) {
  :root {
    --masonry-columns: 3;
    --masonry-gap: 1rem;
  }
}

/* 平板端横屏 */
@media (max-width: 1024px) {
  :root {
    --masonry-columns: 3;
    --masonry-gap: 0.875rem;
  }
  
  .image-gallery {
    padding: 0.75rem;
  }
}

/* 平板端竖屏 */
@media (max-width: 768px) {
  :root {
    --masonry-columns: 2;
    --masonry-gap: 0.75rem;
  }
  
  .image-gallery {
    padding: 0.5rem;
  }
  
  .masonry-container {
    gap: var(--masonry-gap, 0.75rem);
  }
  
  .masonry-item {
    margin-bottom: var(--masonry-gap, 0.75rem);
    border-radius: 10px;
  }
  
  .image-name {
    font-size: 0.9rem;
    padding: 0.7rem;
    min-height: 2.7em;
  }
  
  .gallery-empty-placeholder {
    padding: 2.5rem 1.5rem;
    margin: 1.5rem;
  }
  
  .empty-icon {
    font-size: 3.5rem;
  }
  
  .empty-title {
    font-size: 1.3rem;
  }
}

/* 手机端大屏 */
@media (max-width: 640px) {
  :root {
    --masonry-columns: 1;
    --masonry-gap: 0.625rem;
  }
  
  .image-gallery {
    padding: 0.375rem;
  }
  
  .masonry-container {
    gap: var(--masonry-gap, 0.625rem);
  }
  
  .masonry-item {
    margin-bottom: var(--masonry-gap, 0.625rem);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  
  .masonry-item:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .image-name {
    font-size: 0.875rem;
    padding: 0.625rem;
    line-height: 1.4;
    min-height: 2.5em;
  }
  
  .gallery-empty-placeholder {
    padding: 2rem 1rem;
    margin: 1rem 0.5rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-title {
    font-size: 1.2rem;
  }
}

/* 手机端标准 */
@media (max-width: 480px) {
  :root {
    --masonry-columns: 1;
    --masonry-gap: 0.5rem;
  }
  
  .image-gallery {
    padding: 0.25rem;
  }
  
  .masonry-container {
    gap: var(--masonry-gap, 0.5rem);
  }
  
  .masonry-item {
    margin-bottom: var(--masonry-gap, 0.5rem);
    border-radius: 6px;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  }
  
  .masonry-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  .image-name {
    font-size: 0.8125rem;
    padding: 0.5rem;
    line-height: 1.35;
    min-height: 2.4em;
  }
  
  .gallery-empty-placeholder {
    padding: 1.5rem 1rem;
    margin: 0.5rem;
  }
  
  .empty-icon {
    font-size: 2.5rem;
  }
  
  .empty-title {
    font-size: 1.1rem;
  }
  
  .empty-description {
    font-size: 0.9rem;
  }
}

/* 超小屏手机 */
@media (max-width: 375px) {
  :root {
    --masonry-gap: 0.375rem;
  }
  
  .image-gallery {
    padding: 0.125rem;
  }
  
  .masonry-container {
    gap: var(--masonry-gap, 0.375rem);
  }
  
  .masonry-item {
    margin-bottom: var(--masonry-gap, 0.375rem);
    border-radius: 4px;
  }
  
  .image-name {
    font-size: 0.75rem;
    padding: 0.5rem 0.375rem;
    min-height: 2.2em;
  }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .image-gallery {
    padding: 0.5rem;
  }
  
  .masonry-item {
    border-radius: 6px;
  }
  
  .image-name {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .masonry-item:hover {
    transform: none;
    box-shadow: var(--masonry-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  }
  
  .masonry-item:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
}

/* 防止移动端缩放 */
@media (max-width: 768px) {
  .masonry-item {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}

/* 滚动性能优化 */
.masonry-container {
  -webkit-overflow-scrolling: touch;
  transform: translateZ(0);
}

.masonry-item {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

/* CSS变量支持 */
:root {
  --masonry-gap: 1rem;
  --masonry-columns: 3;
  --masonry-item-radius: 12px;
  --masonry-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --masonry-shadow-hover: 0 8px 25px rgba(0, 0, 0, 0.25);
}

@media (min-width: 1200px) {
  :root {
    --masonry-columns: 4;
  }
}

@media (min-width: 1400px) {
  :root {
    --masonry-columns: 5;
  }
}
</style>