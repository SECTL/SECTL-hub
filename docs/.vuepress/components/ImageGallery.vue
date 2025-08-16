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
          :style="{ height: getRandomHeight(200, 400) + 'px' }"
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
          <div class="image-name">{{ formatImageName(image) }}</div>
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

// 为每张图片分配高度
const getImageHeight = (image) => {
  if (!imageHeights.value[image]) {
    // 根据图片名称生成伪随机高度（保持一致性）
    const hash = image.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const baseHeight = 250 + (Math.abs(hash) % 200);
    imageHeights.value[image] = baseHeight;
  }
  return imageHeights.value[image];
};

// 计算响应式列数
const calculateColumns = () => {
  const width = window.innerWidth;
  if (width >= 1400) return 5;
  if (width >= 1200) return 4;
  if (width >= 992) return 3;
  if (width >= 768) return 2;
  return 1;
};

// 重新分配图片到列
const distributeImages = (imagesToDistribute) => {
  const newColumns = Array.from({ length: columnCount.value }, () => []);
  const newHeights = Array.from({ length: columnCount.value }, () => 0);
  
  imagesToDistribute.forEach(image => {
    const shortestColumnIndex = newHeights.indexOf(Math.min(...newHeights));
    newColumns[shortestColumnIndex].push(image);
    newHeights[shortestColumnIndex] += getImageHeight(image) + 16; // 加上间距
  });
  
  columnHeights.value = newHeights;
  columns.value = newColumns;
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
  
  // 调整列高度
  const img = event.target;
  const actualHeight = img.naturalHeight;
  const aspectRatio = img.naturalWidth / actualHeight;
  const containerWidth = masonryContainer.value?.offsetWidth / columnCount.value - 16;
  const calculatedHeight = containerWidth / aspectRatio;
  
  // 更新实际高度
  if (calculatedHeight > 0) {
    imageHeights.value[image] = calculatedHeight + 60; // 加上标题高度
  }
  
  nextTick(() => {
    distributeImages(displayedImages.value);
  });
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

// 响应式调整
const handleResize = () => {
  const newColumnCount = calculateColumns();
  if (newColumnCount !== columnCount.value) {
    columnCount.value = newColumnCount;
    nextTick(() => {
      distributeImages(displayedImages.value);
    });
  }
};

// 获取图片列表
const fetchImages = async () => {
  loading.value = true;
  
  try {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const builtinImages = [
      '（把藏狐绑起来）.png',
      '藏狐黑化ing.png',
      '东北粗口.png',
      '淦亖你啊.png',
      '你妈比的！.png',
      '拖出去斩了.png',
      '我不管.png',
      '粤韵风华.png'
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

// 组件生命周期
onMounted(() => {
  fetchImages();
  
  // 监听滚动和窗口变化
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  
  // 初始计算列数
  columnCount.value = calculateColumns();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
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
  min-height: 100vh;
}

/* 瀑布流容器 */
.masonry-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
}

.masonry-column {
  display: inline-block;
  vertical-align: top;
  width: calc(100% / var(--columns, 3));
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.masonry-item {
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  width: 100%;
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

.masonry-item:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

@keyframes fadeInUp {
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
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--vp-c-bg);
  margin: 0;
  line-height: 1.2;
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
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

/* 响应式设计 */
@media (max-width: 1400px) {
  .masonry-column {
    width: calc(100% / 4);
  }
}

@media (max-width: 1200px) {
  .masonry-column {
    width: calc(100% / 3);
  }
}

@media (max-width: 992px) {
  .masonry-column {
    width: calc(100% / 2);
  }
  
  .placeholder-masonry {
    flex-direction: column;
  }
  
  .placeholder-item {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .image-gallery {
    padding: 0.5rem;
  }
  
  .masonry-column {
    width: 100%;
    padding: 0 0.25rem;
  }
  
  .masonry-item {
    margin-bottom: 0.75rem;
  }
  
  .gallery-empty-placeholder {
    padding: 2rem 1rem;
    margin: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
}

@media (max-width: 480px) {
  .image-name {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
  
  .masonry-item {
    margin-bottom: 0.5rem;
  }
}

/* CSS变量支持 */
:root {
  --masonry-gap: 1rem;
  --masonry-columns: 3;
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