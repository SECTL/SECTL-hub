<template>
  <div class="image-gallery">
    <!-- 加载占位组件 -->
    <div v-if="loading" class="gallery-placeholder">
      <div class="placeholder-header">
        <div class="placeholder-shimmer"></div>
        <div class="placeholder-text">图片加载中...</div>
      </div>
      <div class="placeholder-grid">
        <div 
          v-for="i in 6" 
          :key="i" 
          class="placeholder-item"
        >
          <div class="placeholder-image shimmer"></div>
          <div class="placeholder-title shimmer"></div>
        </div>
      </div>
    </div>
    
    <!-- 空状态占位组件 -->
    <div v-else-if="images.length === 0" class="gallery-empty-placeholder">
      <div class="empty-icon">📷</div>
      <div class="empty-title">暂无图片</div>
      <div class="empty-description">请检查图片文件是否存在</div>
    </div>
    
    <!-- 图片网格 -->
    <div v-else class="gallery-grid">
      <div 
        v-for="(image, index) in images" 
        :key="index" 
        class="gallery-item"
        @click="openPreview(image)"
      >
        <img 
          :src="getImageUrl(image)" 
          :alt="image" 
          loading="lazy" 
          @error="handleImageError($event, image)"
        />
        <div class="image-name">{{ formatImageName(image) }}</div>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <div 
      v-if="previewVisible" 
      class="image-preview" 
      @click="closePreview"
    >
      <div class="preview-content" @click.stop>
        <img :src="previewSrc" alt="预览图片" />
        <button class="close-btn" @click="closePreview">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 状态变量
const loading = ref(true);
const images = ref([]);
const previewVisible = ref(false);
const previewSrc = ref('');
const failedImages = ref([]);

// 格式化图片名称 - 移除扩展名和特殊字符
const formatImageName = (filename) => {
  // 先解码URL编码，然后移除扩展名
  const decodedName = decodeURIComponent(filename);
  const nameWithoutExt = decodedName.split('.').slice(0, -1).join('.');
  return nameWithoutExt;
};

// 获取图片URL - 使用正确的public路径
const getImageUrl = (filename) => {
  // 使用相对于public目录的正确路径
  return `https://github.com/SECTL/SECTL-hub/blob/main/docs/public/images/${encodeURIComponent(filename)}`;
};

// 处理图片加载错误
const handleImageError = (event, imageName) => {
  console.error(`图片加载失败: ${imageName}`, event.target.src);
  failedImages.value.push(imageName);
  
  const img = event.target;
  img.style.display = 'none';
  
  // 创建错误占位符
  const errorPlaceholder = document.createElement('div');
  errorPlaceholder.className = 'image-error-placeholder';
  errorPlaceholder.innerHTML = '📷 加载失败';
  errorPlaceholder.style.cssText = `
    width: 100%;
    aspect-ratio: 1;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 0.8rem;
    border-radius: 8px;
  `;
  
  img.parentElement.insertBefore(errorPlaceholder, img);
};

// 自动获取图片列表
const fetchImages = async () => {
  loading.value = true;
  
  try {    
    // 回退到内置图片列表
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const builtinImages = [
      '不行！不行！.png',
      '淦亖你啊.png',
      '叫你搞.png',
      '想谋权算位是不是？！.png'
    ];
    
    const validImages = builtinImages.filter(filename => {
      const extension = filename.split('.').pop()?.toLowerCase();
      return extension && imageExtensions.includes(extension);
    });
    
    // 按字母顺序排序并去重
    const uniqueImages = [...new Set(validImages)].sort((a, b) => 
      a.localeCompare(b, 'zh-CN', { sensitivity: 'base' })
    );
    
    images.value = uniqueImages;
    
    // 添加调试信息
    console.log('加载的图片列表:', uniqueImages);
    
  } catch (error) {
    console.error('获取图片列表失败:', error);
    images.value = [];
  } finally {
    loading.value = false;
  }
};

// 组件挂载时获取图片
onMounted(() => {
  fetchImages();
});
</script>

<style scoped>
.image-gallery {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
}

.gallery-loading,
.gallery-empty {
  text-align: center;
  color: #888;
  font-size: 1.2rem;
  padding: 2rem 0;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  width: 100%;
  max-width: 100%;
}

.gallery-item:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

.gallery-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
  max-width: 100%;
}

.image-name {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 加载占位组件样式 */
.gallery-placeholder {
  width: 100%;
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

.placeholder-text {
  font-size: 1.2rem;
  color: #666;
  font-weight: 500;
}

.placeholder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
  gap: 1rem;
  width: 100%;
}

.placeholder-item {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  width: 100%;
}

.placeholder-image {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(90deg, #f5f5f5 25%, #e8e8e8 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}

.placeholder-title {
  height: 20px;
  margin: 0.75rem;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

/* 空状态占位组件样式 */
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
  margin: 2rem 0;
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

/* 骨架屏动画 */
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

/* 图片预览模态框 */
.image-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.preview-content {
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
}

.preview-content img {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  z-index: 1001;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 宽屏优化 */
@media (min-width: 1200px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
    gap: 1.5rem;
  }
}

@media (min-width: 1600px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
    gap: 2rem;
  }
}

/* 占位组件移动端优化 */
@media (max-width: 768px) {
  .placeholder-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr));
    gap: 0.5rem;
  }
  
  .placeholder-title {
    height: 16px;
    margin: 0.5rem;
  }
  
  .gallery-empty-placeholder {
    padding: 2rem 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
}
</style>