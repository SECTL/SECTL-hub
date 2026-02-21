const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const IMAGES_DIR = path.join(__dirname, '..', 'docs', '.vuepress', 'public', 'images');
const IMAGE_GALLERY_PATH = path.join(__dirname, '..', 'docs', '.vuepress', 'components', 'ImageGallery.vue');

function formatShanghaiDate(date) {
  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
}

function getGitFileCreatedDate(relativePath) {
  try {
    const output = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', relativePath],
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
    ).trim();

    if (!output) return null;

    const lines = output.split(/\r?\n/).filter(Boolean);
    const oldest = lines[lines.length - 1];
    const date = new Date(oldest);
    if (Number.isNaN(date.getTime())) return null;

    return date;
  } catch {
    return null;
  }
}

function getImageCreatedDate(img) {
  const repoRelativePath = path.posix.join('docs', '.vuepress', 'public', 'images', img);

  const gitCreated = getGitFileCreatedDate(repoRelativePath);
  if (gitCreated) return formatShanghaiDate(gitCreated);

  try {
    const stats = fs.statSync(path.join(IMAGES_DIR, img));
    const date = stats.birthtime && stats.birthtime.getTime() ? stats.birthtime : stats.mtime;
    return formatShanghaiDate(new Date(date));
  } catch {
    return formatShanghaiDate(new Date());
  }
}

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
    
    const imagesWithDates = images.map(img => {
      try {
        const pushDate = getImageCreatedDate(img);
        return { name: img, pushDate };
      } catch (error) {
        console.warn(`无法获取 ${img} 的创建时间:`, error.message);
        return { name: img, pushDate: formatShanghaiDate(new Date()) };
      }
    });
    
    // 生成新的图片数组字符串，包含真实的创建时间
    const imageListStr = imagesWithDates.map(img => `        { name: '${img.name.replace(/'/g, "\\'")}', pushDate: '${img.pushDate}' }`).join(',\n');
    
    let newContent = content;

    const defaultListPattern = /(let\s+imageList\s*=\s*\[)([\s\S]*?)(\n\s*\];)/;
    const fallbackListPattern = /(if\s*\(\s*imageList\.length\s*===\s*0\s*\)\s*\{\s*\n\s*imageList\s*=\s*\[)([\s\S]*?)(\n\s*\];)/;

    let updatedCount = 0;

    if (defaultListPattern.test(newContent)) {
      newContent = newContent.replace(defaultListPattern, `$1\n${imageListStr}$3`);
      updatedCount += 1;
    }

    if (fallbackListPattern.test(newContent)) {
      newContent = newContent.replace(fallbackListPattern, `$1\n${imageListStr}$3`);
      updatedCount += 1;
    }

    if (updatedCount === 0) {
      console.log('尝试备用方案...');
      const imageArrayPattern = /imageList = \[([\s\S]*?)\];/;
      if (imageArrayPattern.test(newContent)) {
        newContent = newContent.replace(imageArrayPattern, `imageList = [\n${imageListStr}\n      ];`);
        updatedCount += 1;
      }
    }
    
    if (updatedCount > 0) {
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
