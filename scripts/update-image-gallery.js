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
        return imageExtensions.includes(ext);
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
    
    // 生成新的图片数组字符串
    const imageListStr = images.map(img => `      '${img}'`).join(',\n');
    
    // 替换原有的内置图片列表
    const pattern = /(\/\/ 回退到内置图片列表\s+const imageExtensions = \[.*?\];\s+const builtinImages = \[)[\s\S]*?(\s+\];)/;
    
    const newContent = content.replace(pattern, 
      `$1\n${imageListStr}$2`
    );
    
    if (newContent === content) {
      console.log('没有找到需要替换的图片列表，尝试备用模式...');
      
      // 备用模式：直接查找数组定义
      const arrayPattern = /const builtinImages = \[([\s\S]*?)\];/;
      const arrayMatch = content.match(arrayPattern);
      
      if (arrayMatch) {
        const newArray = `const builtinImages = [\n${imageListStr}\n    ];`;
        const finalContent = content.replace(arrayPattern, newArray);
        fs.writeFileSync(IMAGE_GALLERY_PATH, finalContent, 'utf8');
        console.log('✅ 图片画廊已使用备用模式更新');
      } else {
        console.error('❌ 无法找到图片列表进行更新');
        return false;
      }
    } else {
      fs.writeFileSync(IMAGE_GALLERY_PATH, newContent, 'utf8');
      console.log('✅ 图片画廊已成功更新');
    }
    
    return true;
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