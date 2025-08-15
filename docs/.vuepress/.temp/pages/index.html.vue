<template><div><h1 id="sectl-hub" tabindex="-1"><a class="header-anchor" href="#sectl-hub"><span>SECTL-hub</span></a></h1>
<div id="image-container" class="image-gallery">
  <div class="loading-info">正在加载图片...</div>
</div>
<!-- 图片预览模态框 -->
<div id="image-preview" class="image-preview" onclick="closeImagePreview()" style="display: none;">
  <div class="preview-content" onclick="event.stopPropagation()">
    <img id="preview-img" src="" alt="预览图片" />
    <button class="close-btn" onclick="closeImagePreview()">×</button>
  </div>
</div>
</div></template>

<script>
// VuePress 动态图片加载系统 - 自动获取图片版本
(function() {
  'use strict';
  // 图片预览功能 - 全局函数
  window.openImagePreview = function(src) {
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    if (preview && previewImg) {
      previewImg.src = src;
      preview.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };
  
  window.closeImagePreview = function() {
    const preview = document.getElementById('image-preview');
    if (preview) {
      preview.style.display = 'none';
      document.body.style.overflow = '';
    }
  };
  
  // 创建图片元素
  function createImageElement(filename) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    
    const img = document.createElement('img');
    img.src = `/images/${filename}`;
    img.alt = filename.replace(/\.[^/.]+$/, '');
    img.loading = 'lazy';
    img.onerror = () => {
      console.error(`图片加载失败: ${filename}`);
      imageItem.style.display = 'none';
    };
    
    img.onclick = () => window.openImagePreview(`/images/${filename}`);
    
    imageItem.appendChild(img);
    return imageItem;
  }
  
  // 自动获取图片文件列表
  async function fetchImageList() {
    // 支持的图片扩展名
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
    
    // 在VuePress环境中，我们可以尝试通过两种方式获取图片列表
    
    // 方式1: 尝试使用fetch获取目录内容(通常需要服务器配置)
    try {
      const response = await fetch('/images/');
      if (response.ok) {
        const html = await response.text();
        // 从HTML响应中提取文件名
        const fileNames = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && supportedExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
            // 只获取文件名，不包含路径
            const fileName = href.split('/').pop();
            if (fileName) fileNames.push(fileName);
          }
        });
        
        console.log('通过fetch获取到图片列表:', fileNames);
        return fileNames;
      }
    } catch (error) {
      console.error('fetch获取图片列表失败:', error);
    }
    
    // 方式2: 备选方案 - 使用已知的图片文件名
    // 这是一个后备方案，当无法通过fetch获取目录内容时使用
    const knownImages = [
      '不行！不行！.png',
      '叫你搞.png',
      '想谋权算位是不是？！.png',
      '淦亖你啊.png'
    ];
    
    console.log('使用备选图片列表:', knownImages);
    return knownImages;
  }

  // 动态加载图片 - 带重试机制
    async function loadImages(retries = 3, delay = 300) {
    console.log('VuePress 动态图片加载开始...');
    
    // 使用多种方式获取容器
    let container = null;
    const selectors = ['#image-container', '.image-gallery', '[id*="image"]'];
    
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log('找到图片容器:', selector);
        break;
      }
    }
    
    if (!container) {
      if (retries > 0) {
        console.warn(`无法找到图片容器，${delay}ms后重试(${retries}次)...`);
        setTimeout(() => loadImages(retries - 1, delay * 1.5), delay);
        return;
      }
      console.error('无法找到任何图片容器');
      // 创建一个临时容器，避免页面空白
      container = document.createElement('div');
      container.id = 'image-container';
      container.className = 'image-gallery';
      document.body.appendChild(container);
      console.warn('已创建临时图片容器');
    }
    
    // 清空并显示加载状态
    container.innerHTML = '<div class="loading-info">正在加载图片...</div>';
    
    try {
      // 自动获取图片列表
      const imageFiles = await fetchImageList();
      
      if (imageFiles.length === 0) {
        container.innerHTML = '<div class="loading-info">没有找到图片文件</div>';
        return;
      }
      
      // 清空容器
      container.innerHTML = '';
      
      // 添加加载动画
      imageFiles.forEach((filename, index) => {
        setTimeout(() => {
          const imageElement = createImageElement(filename);
          container.appendChild(imageElement);
          
          // 添加淡入效果
          imageElement.style.opacity = '0';
          imageElement.style.transform = 'scale(0.9)';
          setTimeout(() => {
            imageElement.style.transition = 'all 0.3s ease';
            imageElement.style.opacity = '1';
            imageElement.style.transform = 'scale(1)';
          }, 50);
        }, index * 100); // 延迟加载效果
      });
      
      console.log(`VuePress 成功加载 ${imageFiles.length} 张图片:`, imageFiles);
      
    } catch (error) {
      console.error('VuePress 图片加载失败:', error);
      container.innerHTML = '<div class="loading-info">加载图片失败，请刷新页面重试</div>';
    }
  }
  
  // VuePress 兼容性初始化
  function initializeForVuePress() {
    // 方法1: 标准DOM加载事件
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadImages);
    } else {
      loadImages();
    }
    
    // 方法2: 页面完全加载后执行
    window.addEventListener('load', function() {
      setTimeout(loadImages, 100);
    });
    
    // 方法3: VuePress 特有的内容更新后执行
    if (window.Vue) {
      window.Vue.nextTick(loadImages);
    }
    
    // 方法4: 观察DOM变化
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          const container = document.getElementById('image-container') || 
                           document.querySelector('.image-gallery');
          if (container && container.children.length <= 1) {
            loadImages();
          }
        }
      });
    });
    
    // 观察body的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 方法5: 延迟执行（确保DOM已渲染）
    setTimeout(loadImages, 500);
  }
  
  // 立即初始化
  initializeForVuePress();
})();
</script>

<style>
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 8px;
  width: 100%;
  box-sizing: border-box;
}

.image-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  border-radius: 4px;
  transition: transform 0.2s ease;
}

.image-item:hover {
  transform: scale(1.02);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.preview-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  cursor: default;
}

.preview-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
  padding: 5px 10px;
  transition: opacity 0.3s ease;
  opacity: 0.8;
}

.close-btn:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px;
    padding: 6px;
  }
}

@media (max-width: 480px) {
  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 4px;
    padding: 4px;
  }
}
</style>