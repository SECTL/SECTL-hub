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
      </div>
    </div>
    
    <!-- 智能瀑布流布局 -->
    <div v-else class="masonry-container" ref="masonryContainer">
      <div 
        v-for="(column, columnIndex) in columns" 
        :key="columnIndex" 
        class="masonry-column"
        :style="{ width: `calc(${100 / columnCount}% - ${(columnCount - 1) * 12.5}px)` }"
      >
        <div 
          v-for="(image, index) in column" 
          :key="image + '-' + index"
          class="masonry-item"
          :style="{ 
            animationDelay: (index * 0.05) + 's', 
            marginBottom: '16px'
          }"
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
              <div 
                class="card-image-loading" 
                v-if="!imageLoaded[(image.name || image)]"
                :style="{ opacity: imageLoaded[(image.name || image)] ? 0 : 1 }"
                style="transition: opacity 0.3s ease-out;"
              ></div>
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ formatImageName(image.name || image) }}</h3>
              <div class="card-meta">
                <span class="type-badge">{{ getImageType(image.name || image) }}</span>
                <span class="date-badge" v-if="image.pushDate">{{ formatDate(image.pushDate) }}</span>
                <span class="index-badge">{{ getColumnImageIndex(columnIndex, index) + 1 }}/{{ images.length }}</span>
              </div>
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
const masonryContainer = ref(null);

// 瀑布流配置
const columnCount = ref(4); 
const batchSize = 12; 
const currentBatch = ref(0);
const isLoading = ref(false);

// 瀑布流列
const columns = ref([]);

// 响应式断点
const breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440
};

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
  // 根据图片名称智能分配宽高比，确保布局均衡
  const ratios = {
    'portrait': '3/4',
    'landscape': '4/3',
    'square': '1/1',
    'wide': '16/9',
    'tall': '9/16'
  };
  
  // 根据文件名特征分配比例
  const filename = typeof image === 'object' ? image.name : image;
  const name = filename.toLowerCase();
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
  } else {
    columnCount.value = 4; // 桌面及以上四列
  }
  
  // 重新分配图片到列
  distributeImagesToColumns();
};

// 将图片分配到各列
const distributeImagesToColumns = () => {
  // 初始化列
  const newColumns = Array.from({ length: columnCount.value }, () => []);
  
  // 将已显示的图片分配到各列
  displayedImages.value.forEach((image, index) => {
    const columnIndex = index % columnCount.value;
    newColumns[columnIndex].push(image);
  });
  
  columns.value = newColumns;
};

// 获取列中图片的全局索引
const getColumnImageIndex = (columnIndex, indexInColumn) => {
  let globalIndex = 0;
  for (let i = 0; i < columnIndex; i++) {
    globalIndex += columns.value[i].length;
  }
  return globalIndex + indexInColumn;
};

// 获取图片URL
const getImageUrl = (image) => {
  const filename = typeof image === 'object' ? image.name : image;
  const encoded = encodeURIComponent(filename);
  
  // 使用完整路径，确保路径正确
  const basePath = window.location.origin;
  const fullUrl = `${basePath}/images/${encoded}`;
  
  // 调试信息
  console.log(`🎯 生成图片URL: ${filename} -> ${fullUrl}`);
  return `/images/${encoded}`; // 保持相对路径，但添加调试
};

// 生成随机高度用于占位符
const getRandomHeight = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 处理图片加载
const handleImageLoad = (event, image) => {
  const key = typeof image === 'object' ? image.name : image;
  imageLoaded.value[key] = true;
  loadedCount.value++;
  console.log(`✅ 图片加载成功: ${key}`);
  
  // 确保加载动画在300ms后完全消失
  setTimeout(() => {
    imageLoaded.value[key] = true;
  }, 300);
};

// 处理图片加载错误
const handleImageError = (event, image) => {
  const key = typeof image === 'object' ? image.name : image;
  console.error(`❌ 图片加载失败: ${key}`);
  console.error(`尝试的URL: ${event.target.src}`);
  
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
  
  // 将新图片添加到已显示图片列表的末尾
  displayedImages.value = [...displayedImages.value, ...newImages];
  
  // 重新分配图片到各列
  distributeImagesToColumns();
  
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
    
    // 方法1: 使用GitHub API获取图片列表和实际上传时间
    if (imageList.length === 0) {
      try {
        const repo = 'SECTL/SECTL-hub';
        const imagesPath = 'docs/.vuepress/public/images';
        
        // 获取目录内容
        const contentsUrl = `https://api.github.com/repos/${repo}/contents/${imagesPath}`;
        const response = await fetch(contentsUrl);
        
        if (response.ok) {
          const files = await response.json();
          const imageFiles = files.filter(file => 
            file.type === 'file' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
          );
          
          // 为每个图片获取提交历史以获取实际上传时间
          const imagePromises = imageFiles.map(async (file) => {
            try {
              // 获取该文件的提交历史
              const commitsUrl = `https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(imagesPath + '/' + file.name)}&per_page=1`;
              const commitResponse = await fetch(commitsUrl);
              
              if (commitResponse.ok) {
                const commits = await commitResponse.json();
                if (commits.length > 0) {
                  const commitDate = commits[0].commit.author.date;
                  return {
                    name: file.name,
                    pushDate: new Date(commitDate).toLocaleDateString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).replace(/\//g, '-')
                  };
                }
              }
            } catch (e) {
              console.warn(`获取 ${file.name} 的提交历史失败:`, e);
            }
            
            // 如果无法获取提交历史，使用文件的最后修改时间
            return {
              name: file.name,
              pushDate: new Date(file.last_modified || Date.now()).toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }).replace(/\//g, '-')
            };
          });
          
          imageList = await Promise.all(imagePromises);
          console.log('✅ 从GitHub API加载图片列表和实际上传时间');
        } else if (response.status === 404) {
          console.log('⚠️ GitHub仓库或路径不存在，跳过API访问');
        } else {
          console.log(`⚠️ GitHub API访问受限 (${response.status})，使用内置列表`);
        }
      } catch (e) {
        console.log('⚠️ GitHub API访问失败，使用内置列表');
      }
    }
    
    // 方法2: 使用内置图片列表作为后备
    if (imageList.length === 0) {
      imageList = [
        { name: '（把藏狐绑起来）.png', pushDate: '2025-10-06' },
        { name: '(拿出绳子,一把捆住藏狐).png', pushDate: '2025-10-06' },
        { name: '《hub-push》.png', pushDate: '2025-10-06' },
        { name: '傲娇猫猫哈气了.png', pushDate: '2025-10-06' },
        { name: '被逼疯的生物.png', pushDate: '2025-10-06' },
        { name: '被威胁了就眨眼.png', pushDate: '2025-10-06' },
        { name: '本新：我还活着.png', pushDate: '2025-10-06' },
        { name: '本新对刘将军史诗巨作的评价.png', pushDate: '2025-10-06' },
        { name: '本新是人机？！.png', pushDate: '2025-10-06' },
        { name: '不知道谁写的史山.png', pushDate: '2025-10-06' },
        { name: '藏狐：我踏马，作业起爆！！.png', pushDate: '2025-10-06' },
        { name: '藏狐宝贵的第一次.png', pushDate: '2025-10-06' },
        { name: '藏狐黑化ing.png', pushDate: '2025-10-06' },
        { name: '藏狐叫了.png', pushDate: '2025-10-06' },
        { name: '藏狐进山.png', pushDate: '2025-10-06' },
        { name: '藏狐自己养异世界の藏狐.png', pushDate: '2025-10-06' },
        { name: '茶馆馆主带头喝茶.png', pushDate: '2025-10-06' },
        { name: '大型🤖养殖场（雾）.png', pushDate: '2025-10-06' },
        { name: '大型嚼茶现场.png', pushDate: '2025-10-06' },
        { name: '倒反天罡，这机器人到底学到了什么奇怪东西.png', pushDate: '2025-10-06' },
        { name: '等离子藏狐炮，砰！.png', pushDate: '2025-10-06' },
        { name: '叠字大狮.png', pushDate: '2025-10-06' },
        { name: '东北粗口.png', pushDate: '2025-10-06' },
        { name: '东北方言.png', pushDate: '2025-10-06' },
        { name: '发情的输入法.png', pushDate: '2025-10-06' },
        { name: '方言狐.png', pushDate: '2025-10-06' },
        { name: '淦亖你啊.png', pushDate: '2025-10-06' },
        { name: '高端优雅的点名动画.png', pushDate: '2025-10-06' },
        { name: '很精准的翻译.png', pushDate: '2025-10-06' },
        { name: '狐言乱语，秦王迷惑.png', pushDate: '2025-10-06' },
        { name: '幻想OS.png', pushDate: '2025-10-06' },
        { name: '婚戒成就.png', pushDate: '2025-10-06' },
        { name: '机械飞升，但是得插电.png', pushDate: '2025-10-06' },
        { name: '开学后生命的转折点.png', pushDate: '2025-10-06' },
        { name: '黎泽懿：卫生巾这梗过不去了是吧.png', pushDate: '2025-10-06' },
        { name: '黎泽懿滞销.png', pushDate: '2025-10-06' },
        { name: '龙尊本色.jpeg', pushDate: '2025-10-06' },
        { name: '冒烟的撤回键.png', pushDate: '2025-10-06' },
        { name: '没有什么插？！.png', pushDate: '2025-10-06' },
        { name: '秒商店开仓老观众.png', pushDate: '2025-10-06' },
        { name: '你管？.png', pushDate: '2025-10-06' },
        { name: '你好刘同学.png', pushDate: '2025-10-06' },
        { name: '你妈比的！.png', pushDate: '2025-10-06' },
        { name: '你想象中的黎泽懿何必是黎泽懿.png', pushDate: '2025-10-06' },
        { name: '你最好在说gun，而不是别的东西...png', pushDate: '2025-10-06' },
        { name: '请群友们注意卫生，勿效仿口臭XXS.png', pushDate: '2025-10-06' },
        { name: '群主很忙.png', pushDate: '2025-10-06' },
        { name: '群主认证_70.png', pushDate: '2025-10-06' },
        { name: '群主认证_85.png', pushDate: '2025-10-06' },
        { name: '群主认证.png', pushDate: '2025-10-06' },
        { name: '群主认证的男娘.png', pushDate: '2025-10-06' },
        { name: '群主说话显得自己很憨.png', pushDate: '2025-10-06' },
        { name: '让我回哪里去？？.png', pushDate: '2025-10-06' },
        { name: '人机也懂，看来确实不是滋味_14.png', pushDate: '2025-10-06' },
        { name: '人机也懂，看来确实不是滋味.png', pushDate: '2025-10-06' },
        { name: '人与bot大型互殴现场.png', pushDate: '2025-10-06' },
        { name: '入典.png', pushDate: '2025-10-06' },
        { name: '赛博灯泡.png', pushDate: '2025-10-06' },
        { name: '身体暖暖的东西.png', pushDate: '2025-10-06' },
        { name: '双重妈比.png', pushDate: '2025-10-06' },
        { name: '思 想 风 暴.png', pushDate: '2025-10-06' },
        { name: '童言无忌.png', pushDate: '2025-10-06' },
        { name: '拖出去斩了.png', pushDate: '2025-10-06' },
        { name: '我不管.png', pushDate: '2025-10-06' },
        { name: '我后台软件应该不多吧.png', pushDate: '2025-10-06' },
        { name: '吸藏狐.png', pushDate: '2025-10-06' },
        { name: '喜欢被霸.png', pushDate: '2025-10-06' },
        { name: '香香软软吹弹可破的藏狐_85.png', pushDate: '2025-10-06' },
        { name: '香香软软吹弹可破的藏狐.png', pushDate: '2025-10-06' },
        { name: '香香软软群主.png', pushDate: '2025-10-06' },
        { name: '小小小小小藏狐.png', pushDate: '2025-10-06' },
        { name: '一世阴名.png', pushDate: '2025-10-06' },
        { name: '有盒同享.png', pushDate: '2025-10-06' },
        { name: '粤韵风华.png', pushDate: '2025-10-06' },
        { name: '杂交龙娘，香香软软.png', pushDate: '2025-10-06' },
        { name: '再盒就是盒装饮料了.png', pushDate: '2025-10-06' },
        { name: '长易句.png', pushDate: '2025-10-06' },
        { name: '珍贵回忆.png', pushDate: '2025-10-06' },
        { name: '只有精没有华消息.png', pushDate: '2025-10-06' },
        { name: '作业滞销，帮帮黎泽懿.png', pushDate: '2025-10-06' },
        { name: 'Deepthinking.png', pushDate: '2025-10-06' },
        { name: 'Follow me！龙娘姐↓姐↑~~~.png', pushDate: '2025-10-06' },
        { name: 'Grok-SECTL纯享版.png', pushDate: '2025-10-06' },
        { name: 'O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A- JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA.png', pushDate: '2025-10-06' },
        { name: 'pH>12.png', pushDate: '2025-10-06' },
        { name: 'sectlmiao.png', pushDate: '2025-10-06' },
        { name: 'Super黎泽懿.png', pushDate: '2025-10-06' }
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
    // 使用展开运算符确保响应式更新
    displayedImages.value = [...initialImages];
    currentBatch.value = 1;
    
    // 初始化加载状态
    images.value.forEach(image => {
      const key = typeof image === 'object' ? image.name : image;
      imageLoaded.value[key] = false;
      
      // 添加5秒超时处理
      setTimeout(() => {
        if (imageLoaded.value[key] === false) {
          console.warn(`⏰ 图片加载超时: ${key}`);
          imageLoaded.value[key] = true; // 强制结束加载状态
        }
      }, 5000);
    });
    
    // 计算初始列数
calculateColumns();
    
    // 分配图片到各列
    distributeImagesToColumns();
    
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
  columns.value = [];
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
  padding: 25px 15px; 
  margin: 0 auto;
  max-width: none; 
  width: 100%;
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
  display: flex;
  gap: 25px;
}

.masonry-column {
  display: flex;
  flex-direction: column;
}

.masonry-item {
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
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%, #f8f9fa 100%);
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
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
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
  color: #333;
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
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
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