<template>
  <div class="masonry-gallery">
    <!-- 图片扫描器组件 -->
    <ImageScanner ref="scanner" @images-discovered="onImagesDiscovered" />
    
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
      <h2 class="empty-title">暂无图片</h2>
      <p class="empty-description">请检查图片文件是否存在</p>
      <div class="empty-actions">
        <button class="refresh-btn" @click="reloadImages">🔄 重新加载</button>
        <button class="scan-btn" @click="startScan">🔍 扫描图片</button>
      </div>
    </div>
    
    <!-- 图片统计信息 -->
    <div v-else class="gallery-info">
      <div class="info-card">
        <span class="info-item">
          <strong>{{ images.length }}</strong> 张图片
        </span>
        <span class="info-item">
          <strong>{{ displayedImages.length }}</strong> 张已加载
        </span>
        <button class="refresh-btn small" @click="reloadImages">🔄 刷新</button>
        <button class="scan-btn small" @click="startScan">🔍 扫描</button>
      </div>
    </div>
    
    <!-- 智能瀑布流布局 -->
    <div v-else class="masonry-container" ref="masonryContainer">
      <div class="masonry-columns" :style="{ columnCount: columnCount }">
        <div 
          v-for="(image, index) in displayedImages"
          :key="image + '-' + index"
          class="masonry-item"
          :style="{ 
            animationDelay: (index * 0.05) + 's',
            breakInside: 'avoid',
            marginBottom: '16px'
          }"
          @click="openImage(image)"
        >
          <div class="masonry-card">
            <div class="card-image-container">
              <img 
                :src="getImageUrl(image)" 
                :alt="image" 
                class="card-image"
                loading="lazy" 
                @load="handleImageLoad($event, image)"
                @error="handleImageError($event, image)"
                :style="{ aspectRatio: getAspectRatio(image) }"
              />
              <div class="card-image-loading" v-if="!imageLoaded[image]"></div>
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ formatImageName(image) }}</h3>
              <div class="card-meta">
                <span class="type-badge">{{ getImageType(image) }}</span>
                <span class="index-badge">{{ index + 1 }}/{{ images.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载更多占位符 -->
      <div v-if="loadingMore" class="loading-more">
        <div class="loading-spinner"></div>
        <span>加载更多图片...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import ImageScanner from './ImageScanner.vue';

// 状态变量
const loading = ref(true);
const loadingMore = ref(false);
const images = ref([]);
const displayedImages = ref([]);
const failedImages = ref([]);
const imageLoaded = ref({});
const loadedCount = ref(0);
const masonryContainer = ref(null);

// 瀑布流配置
const columnCount = ref(3);
const batchSize = 12;
const currentBatch = ref(0);
const isLoading = ref(false);

// 响应式断点
const breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440
};

// 格式化图片名称
const formatImageName = (filename) => {
  const decodedName = decodeURIComponent(filename);
  const nameWithoutExt = decodedName.split('.').slice(0, -1).join('.');
  return nameWithoutExt;
};

// 获取图片类型
const getImageType = (filename) => {
  const extension = filename.split('.').pop()?.toUpperCase();
  return extension || 'IMAGE';
};

// 获取图片宽高比（用于瀑布流布局）
const getAspectRatio = (image) => {
  // 根据图片名称智能分配宽高比，确保布局均衡
  const ratios = {
    'portrait': '3/4',
    'landscape': '4/3',
    'square': '1/1',
    'wide': '16/9',
    'tall': '9/16'
  };
  
  // 根据文件名特征分配比例
  const name = image.toLowerCase();
  if (name.includes('long') || name.includes('wide')) return ratios.wide;
  if (name.includes('tall') || name.includes('high')) return ratios.tall;
  if (name.includes('square')) return ratios.square;
  
  // 随机分配但保持均衡
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const index = hash % 4;
  return Object.values(ratios)[index];
};

// 计算响应式列数
const calculateColumns = () => {
  const width = window.innerWidth;
  
  if (width < breakpoints.mobile) {
    columnCount.value = 2; // 移动端两列
  } else if (width < breakpoints.tablet) {
    columnCount.value = 3; // 平板三列
  } else if (width < breakpoints.desktop) {
    columnCount.value = 4; // 桌面四列
  } else {
    columnCount.value = 5; // 大屏五列
  }
};

// 获取图片URL
const getImageUrl = (filename) => {
  // 将全角中文括号替换为半角英文括号，然后再编码
  const encoded = encodeURIComponent(filename);
  const fullUrl = `/images/${encoded}`;
  
  // 调试信息
  console.log(`🎯 生成图片URL: ${filename} -> ${fullUrl}`);
  return fullUrl;
};

// 生成随机高度用于占位符
const getRandomHeight = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 打开图片（可以扩展为图片查看器）
const openImage = (image) => {
  const url = getImageUrl(image);
  console.log('📷 打开图片:', image, 'URL:', url);
  
  // 测试图片URL是否有效
  const img = new Image();
  img.onload = () => {
    console.log('✅ 图片可正常访问:', url);
    // 这里可以打开图片查看器
    window.open(url, '_blank');
  };
  img.onerror = () => {
    console.error('❌ 图片访问失败:', url);
    alert(`图片访问失败: ${image}\nURL: ${url}`);
  };
  img.src = url;
};

// 处理图片加载
const handleImageLoad = (event, image) => {
  imageLoaded.value[image] = true;
  loadedCount.value++;
  console.log(`✅ 图片加载成功: ${image}`);
};

// 处理图片加载错误
const handleImageError = (event, image) => {
  console.error(`❌ 图片加载失败: ${image}`);
  console.error(`尝试的URL: ${event.target.src}`);
  
  // 记录失败的图片
  failedImages.value.push(image);
  imageLoaded.value[image] = true;
  loadedCount.value++;
  
  // 显示错误占位符
  event.target.style.display = 'none';
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    background: #f5f5f5;
    color: #666;
    padding: 20px;
    text-align: center;
    font-size: 0.9rem;
    border-radius: 8px;
  `;
  errorDiv.textContent = `图片加载失败: ${image}`;
  event.target.parentNode.appendChild(errorDiv);
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

// 加载下一批图片
const loadMoreImages = async () => {
  if (isLoading.value || currentBatch.value * batchSize >= images.value.length) return;
  
  isLoading.value = true;
  loadingMore.value = true;
  
  const startIndex = currentBatch.value * batchSize;
  const endIndex = Math.min(startIndex + batchSize, images.value.length);
  const newImages = images.value.slice(startIndex, endIndex);
  
  // 延迟加载以展示加载动画
  await new Promise(resolve => setTimeout(resolve, 600));
  
  displayedImages.value.push(...newImages);
  currentBatch.value++;
  isLoading.value = false;
  loadingMore.value = false;
};

// 获取图片列表 - 动态加载
const fetchImages = async () => {
  try {
    loading.value = true;
    
    // 调试信息
    console.log('🔍 开始加载图片列表...');
    
    // 尝试多种方式获取图片列表
    let imageList = [];
    
    // 方法1: 扫描images目录
    if (imageList.length === 0) {
      try {
        // 使用GitHub API获取目录内容（适用于GitHub Pages）
        const repo = 'SECTL/SECTL-hub';
        const apiUrl = `https://api.github.com/repos/${repo}/contents/docs/.vuepress/public/images`;
        
        const response = await fetch(apiUrl);
        if (response.ok) {
          const files = await response.json();
          imageList = files
            .filter(file => file.type === 'file')
            .filter(file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name))
            .map(file => file.name);
          console.log('✅ 从GitHub API加载图片列表');
        }
      } catch (e) {
        console.log('GitHub API访问失败，使用内置列表');
      }
    }
    
    // 方法2: 使用内置图片列表作为后备
    if (imageList.length === 0) {
      imageList = [
        '（把藏狐绑起来）.png',
        '(拿出绳子,一把捆住藏狐).png',
        '藏狐黑化ing.png',
        '藏狐自己养异世界の藏狐.png',
        '东北粗口.png',
        '发情的输入法.png',
        '淦亖你啊.png',
        '狐言乱语，秦王迷惑.png',
        '黎泽懿滞销.png',
        '龙尊本色.jpeg',
        '你管？.png',
        '你妈比的！.png',
        '让我回哪里去？？.png',
        '入典.png',
        '双重妈比.png',
        '拖出去斩了.png',
        '我不管.png',
        '喜欢被霸.png',
        '小小小小小藏狐.png',
        '粤韵风华.png',
        '珍贵回忆.png',
        'Deepthinking.png',
        'O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A- JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA.png'
      ];
      console.log('使用内置图片列表');
    }
    
    // 调试：打印所有找到的图片
    console.log('📸 找到的图片:', imageList);
    
    // 排序图片（按名称）
    imageList.sort((a, b) => {
      const nameA = formatImageName(a).toLowerCase();
      const nameB = formatImageName(b).toLowerCase();
      return nameA.localeCompare(nameB, 'zh-CN');
    });
    
    images.value = imageList;
    
    // 初始化第一批显示的图片
    const initialImages = images.value.slice(0, batchSize);
    displayedImages.value = initialImages;
    currentBatch.value = 1;
    
    // 初始化加载状态
    images.value.forEach(image => {
      imageLoaded.value[image] = false;
    });
    
    // 计算初始列数
    calculateColumns();
    
    console.log(`✅ 成功加载 ${images.value.length} 张图片`);
    
  } catch (error) {
    console.error('加载图片失败:', error);
    images.value = [];
  } finally {
    loading.value = false;
  }
};

// 重新加载图片列表
const reloadImages = async () => {
  displayedImages.value = [];
  currentBatch.value = 0;
  loadedCount.value = 0;
  imageLoaded.value = {};
  await fetchImages();
};

// 处理图片发现事件
const onImagesDiscovered = (newImages) => {
  if (newImages && newImages.length > 0) {
    console.log('🎉 发现新图片:', newImages.length, '张');
    // 如果发现了新图片，重新加载
    reloadImages();
  }
};

// 开始扫描图片
const startScan = () => {
  const scanner = document.querySelector('.image-scanner');
  if (scanner) {
    scanner.scrollIntoView({ behavior: 'smooth' });
  }
  
  // 触发扫描
  if (window.imageScanner) {
    window.imageScanner.scanImages();
  }
};

// 组件生命周期
onMounted(() => {
  fetchImages();
  
  // 监听滚动加载更多
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // 监听窗口大小变化
  window.addEventListener('resize', calculateColumns);
  
  // 监听图片更新事件
  document.addEventListener('imagesUpdated', (event) => {
    console.log('🔄 收到图片更新事件:', event.detail);
    reloadImages();
  });
  
  // 注册全局API
  window.imageGallery = {
    reloadImages,
    images: computed(() => images.value),
    displayedImages: computed(() => displayedImages.value)
  };
  
  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', calculateColumns);
    document.removeEventListener('imagesUpdated', () => {});
    if (window.imageGallery) {
      delete window.imageGallery;
    }
  });
});
</script>

<style scoped>
/* 主容器样式 */
.masonry-gallery {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
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

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: #666;
}

.empty-description {
  color: #999;
  margin-bottom: 30px;
}

.empty-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.refresh-btn,
.scan-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.refresh-btn {
  background: #007bff;
  color: white;
}

.scan-btn {
  background: #28a745;
  color: white;
}

.refresh-btn:hover,
.scan-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.refresh-btn.small,
.scan-btn.small {
  padding: 8px 16px;
  font-size: 0.9rem;
}

/* 信息卡片 */
.gallery-info {
  margin-bottom: 30px;
}

.info-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.info-item {
  font-size: 1.1rem;
}

/* 智能瀑布流布局 */
.masonry-container {
  width: 100%;
}

.masonry-columns {
  column-gap: 20px;
  column-fill: balance;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 20px;
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.masonry-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.masonry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 图片容器 */
.card-image-container {
  position: relative;
  overflow: hidden;
  background: #f8f9fa;
}

.card-image {
  width: 100%;
  height: auto;
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
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px 12px 0 0;
}

/* 内容区域 */
.card-content {
  padding: 16px;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  word-break: break-word;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.type-badge,
.index-badge {
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 12px;
  background: #f0f0f0;
  color: #666;
}

.type-badge {
  background: #e3f2fd;
  color: #1976d2;
}

.index-badge {
  background: #f3e5f5;
  color: #7b1fa2;
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
    padding: 10px;
  }
  
  .masonry-columns {
    column-count: 2 !important;
    column-gap: 10px;
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
}

@media (min-width: 641px) and (max-width: 1024px) {
  .masonry-columns {
    column-count: 3 !important;
    column-gap: 15px;
  }
  
  .masonry-item {
    margin-bottom: 15px;
  }
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .masonry-columns {
    column-count: 4 !important;
    column-gap: 20px;
  }
}

@media (min-width: 1441px) {
  .masonry-columns {
    column-count: 5 !important;
    column-gap: 25px;
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