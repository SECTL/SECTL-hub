<template>
  <div class="image-gallery">
    <div v-if="loading" class="gallery-loading">加载中...</div>
    <div v-else-if="images.length === 0" class="gallery-empty">没有图片</div>
    <div v-else class="gallery-grid">
      <div 
        v-for="(image, index) in images" 
        :key="index" 
        class="gallery-item"
        @click="openPreview(image)"
      >
        <img 
          :src="`./images/${image}`" 
          :alt="image" 
          loading="lazy" 
          @error="handleImageError($event)"
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

// 格式化图片名称 - 移除扩展名和特殊字符
const formatImageName = (filename) => {
  // 移除扩展名
  const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
  return nameWithoutExt;
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.parentElement.style.display = 'none';
};

// 自动获取图片列表
const fetchImages = async () => {
  loading.value = true;
  
  try {
    // 尝试从自动生成的图片列表中读取
    try {
      const response = await fetch('/imageList.json');
      if (response.ok) {
        const imageList = await response.json();
        images.value = imageList;
        if (imageList.length === 0) {
          console.warn('图片列表为空');
        }
        return;
      }
    } catch (e) {
      console.log('无法读取自动生成的图片列表，使用内置列表');
    }
    
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
  width: 150%;
  max-width: 100%;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
  overflow-x: hidden;
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

/* 移动端优化 */
@media (max-width: 768px) {
  .image-gallery {
    padding: 0.5rem;
  }
  
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr));
    gap: 0.5rem;
  }
  
  .gallery-item:hover {
    transform: none;
  }
  
  .image-name {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr));
    gap: 0.25rem;
  }
}

/* 主题变量支持 */
:root {
  --vp-c-bg: #ffffff;
  --vp-c-text: #213547;
  --vp-c-divider: #e2e8f0;
}

/* 深色主题 */
@media (prefers-color-scheme: dark) {
  :root {
    --vp-c-bg: #1a1a1a;
    --vp-c-text: #ffffff;
    --vp-c-divider: #333333;
  }
}
</style>