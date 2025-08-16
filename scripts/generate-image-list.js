const fs = require('fs');
const path = require('path');

// 图片目录路径
const imagesDir = path.join(__dirname, '../docs/images');
const outputFile = path.join(__dirname, '../docs/.vuepress/components/imageList.json');

// 支持的图片格式
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

// 生成图片列表
function generateImageList() {
  try {
    // 检查images目录是否存在
    if (!fs.existsSync(imagesDir)) {
      console.warn('Images directory does not exist:', imagesDir);
      return [];
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(imagesDir);
    
    // 过滤出图片文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // 按字母顺序排序
    imageFiles.sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'base' }));

    // 写入JSON文件
    fs.writeFileSync(outputFile, JSON.stringify(imageFiles, null, 2));
    
    console.log(`Generated image list with ${imageFiles.length} images`);
    return imageFiles;
  } catch (error) {
    console.error('Error generating image list:', error);
    return [];
  }
}

// 监听images目录变化
function watchImagesDirectory() {
  if (!fs.existsSync(imagesDir)) {
    console.warn('Images directory does not exist, cannot watch for changes');
    return;
  }

  console.log('Watching images directory for changes...');
  
  fs.watch(imagesDir, (eventType, filename) => {
    if (filename) {
      const ext = path.extname(filename).toLowerCase();
      if (imageExtensions.includes(ext)) {
        console.log(`Image ${eventType}: ${filename}`);
        generateImageList();
      }
    }
  });
}

// 运行生成
const imageList = generateImageList();

// 开发模式下监听变化
if (process.env.NODE_ENV === 'development') {
  watchImagesDirectory();
}

module.exports = { generateImageList, watchImagesDirectory };