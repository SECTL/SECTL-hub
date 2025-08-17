const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'docs', '.vuepress', 'public', 'images');
const IMAGE_GALLERY_PATH = path.join(__dirname, '..', 'docs', '.vuepress', 'components', 'ImageGallery.vue');

function getImageFiles() {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext) && file !== 'manifest.json' && file !== 'auto-update.js';
      })
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  } catch (error) {
    console.error('读取图片目录失败:', error.message);
    return [];
  }
}

function updateImageGallery(images) {
  try {
    let content = fs.readFileSync(IMAGE_GALLERY_PATH, 'utf8');
    
    // 获取当前日期，格式为 YYYY-MM-DD（中国时间）
    const today = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    // 生成新的图片数组字符串，包含日期信息
    const imageListStr = images.map(img => `        { name: '${img.replace(/'/g, "\\'")}', pushDate: '${today}' }`).join(',\n');
    
    // 查找内置图片列表数组
    // 查找 "方法2: 使用内置图片列表作为后备" 注释后的数组定义
    const method2Pattern = /(\/\/ 方法2: 使用内置图片列表作为后备[\s\S]*?imageList = \[)([\s\S]*?)(\s+\];)/;
    
    let newContent = content;
    let updated = false;
    
    const match = content.match(method2Pattern);
    if (match) {
      newContent = content.replace(method2Pattern, `$1\n${imageListStr}\n      ];`);
      updated = true;
    } else {
      // 备用方案：查找任何包含图片数组的地方
      console.log('尝试备用方案...');
      
      // 查找包含图片名称的数组（支持对象格式）
      const imageArrayPattern = /imageList = \[([\s\S]*?)\];/;
      const imageMatch = content.match(imageArrayPattern);
      
      if (imageMatch) {
        newContent = content.replace(imageArrayPattern, `imageList = [\n${imageListStr}\n      ];`);
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(IMAGE_GALLERY_PATH, newContent, 'utf8');
      console.log('✅ 图片画廊已成功更新');
      return true;
    } else {
      console.error('❌ 无法找到内置图片列表进行更新');
      return false;
    }
  } catch (error) {
    console.error('更新图片画廊失败:', error.message);
    return false;
  }
}

function main() {
  console.log('🔄 开始更新图片画廊...');
  
  const images = getImageFiles();
  
  if (images.length === 0) {
    console.log('⚠️ 未找到任何图片文件');
    return;
  }
  
  console.log(`📸 找到 ${images.length} 张图片:`);
  images.forEach(img => console.log(`  - ${img}`));
  
  const success = updateImageGallery(images);
  
  if (success) {
    console.log('🎉 图片画廊更新完成！');
  } else {
    console.log('❌ 图片画廊更新失败！');
    process.exit(1);
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  getImageFiles,
  updateImageGallery
};