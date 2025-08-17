<template>
  <div class="image-scanner">
    <div class="scanner-header">
      <h3>📁 图片扫描器</h3>
      <div class="scanner-controls">
        <button @click="scanImages" :disabled="isScanning" class="scan-btn">
          {{ isScanning ? '⏳ 扫描中...' : '🔍 立即扫描' }}
        </button>
      </div>
    </div>
    
    <div class="scanner-status">
      <div class="status-item">
        <span class="label">扫描状态:</span>
        <span :class="['status', status]">{{ statusText }}</span>
      </div>
      <div class="status-item">
        <span class="label">发现图片:</span>
        <span class="count">{{ discoveredImages.length }}</span>
      </div>
      <div class="status-item">
        <span class="label">最后更新:</span>
        <span class="timestamp">{{ lastScanTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 状态变量
const discoveredImages = ref([]);
const isScanning = ref(false);
const lastScanTime = ref('从未');
const status = ref('idle'); // idle, scanning, success, error

// 计算属性
const statusText = computed(() => {
  switch (status.value) {
    case 'scanning': return '扫描中...';
    case 'success': return '扫描完成';
    case 'error': return '扫描失败';
    default: return '等待扫描';
  }
});

// 添加日志
const addLog = (message, type = 'info') => {
  const now = new Date().toLocaleTimeString('zh-CN');
  logs.value.push({
    time: now,
    message: message,
    type: type
  });
  console.log(`[ImageScanner] ${type.toUpperCase()}: ${message}`);
};

// 扫描图片
const scanImages = async () => {
  if (isScanning.value) return;
  
  isScanning.value = true;
  status.value = 'scanning';
  
  try {
    // 方法1: 使用GitHub API
    try {
      const repo = 'SECTL/SECTL-hub';
      const apiUrl = `https://api.github.com/repos/${repo}/contents/docs/.vuepress/public/images`;
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const files = await response.json();
        const images = files
          .filter(file => file.type === 'file')
          .filter(file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name))
          .map(file => ({
            name: file.name,
            size: file.size,
            download_url: file.download_url,
            source: 'github'
          }));
        
        discoveredImages.value = images;
        status.value = 'success';
        lastScanTime.value = new Date().toLocaleString('zh-CN');
        return;
      }
    } catch (e) {
      console.warn('GitHub API访问失败，使用本地扫描...');
    }
    
    // 方法2: 使用内置列表
    const fallbackImages = [
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
    
    discoveredImages.value = fallbackImages.map(name => ({ name, source: 'local' }));
    status.value = 'success';
    lastScanTime.value = new Date().toLocaleString('zh-CN');
    
  } catch (error) {
    console.error('扫描失败:', error);
    status.value = 'error';
  } finally {
    isScanning.value = false;
  }
};


// 生命周期
onMounted(() => {
  // 初始化时扫描一次
  scanImages();
});
</script>

<style scoped>
.image-scanner {
  background: var(--c-bg-lighter);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-border);
}

.scanner-header h3 {
  margin: 0;
  color: var(--c-text);
  font-size: 18px;
  font-weight: 600;
}

.scanner-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.scan-btn {
  padding: 8px 16px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: var(--c-bg);
  color: var(--c-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.scan-btn:hover:not(:disabled) {
  border-color: var(--c-brand);
  color: var(--c-brand);
}

.scan-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scanner-status {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-item .label {
  color: var(--c-text-lighter);
  font-weight: 500;
}

.status-item .status {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.status.scanning {
  background: #fff3cd;
  color: #856404;
}

.status.success {
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}

.status.idle {
  background: #e2e3e5;
  color: #383d41;
}

.count {
  color: var(--c-brand);
  font-weight: 600;
}

.timestamp {
  color: var(--c-text-lighter);
  font-size: 12px;
}

@media (max-width: 768px) {
  .scanner-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .scanner-controls {
    justify-content: center;
  }
  
  .scanner-status {
    flex-direction: column;
    gap: 8px;
  }
  
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
}
</style>