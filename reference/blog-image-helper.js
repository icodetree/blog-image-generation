#!/usr/bin/env node

/**
 * 블로그 이미지 자동화 도구
 * 
 * 사용법:
 * node blog-image-helper.js "맥미니 M4" --layout=2 --optimize
 * 
 * 옵션:
 * --layout=1  : 1장 레이아웃
 * --layout=2  : 2장 레이아웃 (기본)
 * --layout=3  : 3장 레이아웃
 * --optimize  : WebP 변환 + 리사이즈
 * --caption   : 캡션 추가
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// 설정
const CONFIG = {
  OUTPUT_DIR: './blog-images',
  MAX_WIDTH: 1200,
  QUALITY: 85,
  FORMAT: 'webp'
};

// 명령행 인자 파싱
const args = process.argv.slice(2);
const keyword = args.find(arg => !arg.startsWith('--')) || '맥미니';
const layout = parseInt(args.find(arg => arg.startsWith('--layout='))?.split('=')[1]) || 2;
const shouldOptimize = args.includes('--optimize');
const addCaption = args.includes('--caption');

console.log(`🔍 검색어: ${keyword}`);
console.log(`📐 레이아웃: ${layout}장`);
console.log(`⚡ 최적화: ${shouldOptimize ? 'ON' : 'OFF'}`);

// 출력 디렉토리 생성
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

// ========================================
// 1. 이미지 검색 (Unsplash API 무료 사용)
// ========================================
async function searchImages(query, count = 3) {
  console.log(`\n🔎 "${query}" 이미지 검색 중...`);
  
  // Unsplash API (무료, 키 불필요)
  const url = `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(query)}`;
  
  const images = [];
  for (let i = 0; i < count; i++) {
    images.push({
      url: `${url}&sig=${Date.now()}-${i}`,
      filename: `${sanitizeFilename(query)}-${i + 1}.jpg`
    });
  }
  
  console.log(`✅ ${images.length}개 이미지 URL 생성 완료`);
  return images;
}

// 파일명 안전하게 만들기
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
}

// ========================================
// 2. 이미지 다운로드
// ========================================
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, response => {
      // 리다이렉트 처리
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✓ 다운로드: ${path.basename(filepath)}`);
        resolve(filepath);
      });
    }).on('error', err => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// ========================================
// 3. 이미지 최적화 (ImageMagick 또는 Sharp)
// ========================================
async function optimizeImage(inputPath, outputPath) {
  try {
    // ImageMagick 사용 (brew install imagemagick)
    const command = `convert "${inputPath}" -resize ${CONFIG.MAX_WIDTH}x -quality ${CONFIG.QUALITY} "${outputPath}"`;
    await execPromise(command);
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);
    
    console.log(`  ✓ 최적화: ${path.basename(outputPath)} (${reduction}% 감소)`);
    return outputPath;
  } catch (error) {
    console.log(`  ⚠️  ImageMagick 없음. 원본 사용: ${path.basename(inputPath)}`);
    return inputPath;
  }
}

// ========================================
// 4. HTML 생성
// ========================================
function generateHTML(images, layout, withCaption) {
  let html = '';
  
  switch (layout) {
    case 1:
      // 1장 레이아웃
      html = `<div class="blog-image-container image-single-landscape">
  <img src="${images[0].filepath}" alt="${keyword}">
  ${withCaption ? `<p class="image-caption">${keyword}</p>` : ''}
</div>`;
      break;
      
    case 2:
      // 2장 레이아웃
      html = `<div class="blog-image-container image-grid-2">
  <img src="${images[0].filepath}" alt="${keyword} 1">
  <img src="${images[1].filepath}" alt="${keyword} 2">
</div>
${withCaption ? `<p class="image-caption">${keyword} 비교</p>` : ''}`;
      break;
      
    case 3:
      // 3장 레이아웃 (1+2)
      html = `<div class="blog-image-container image-grid-3">
  <img src="${images[0].filepath}" alt="${keyword} 메인">
  <img src="${images[1].filepath}" alt="${keyword} 상세 1">
  <img src="${images[2].filepath}" alt="${keyword} 상세 2">
</div>
${withCaption ? `<p class="image-caption">${keyword} 상세 이미지</p>` : ''}`;
      break;
      
    default:
      html = `<!-- 레이아웃 ${layout}는 아직 지원하지 않습니다 -->`;
  }
  
  return html;
}

// ========================================
// 메인 실행
// ========================================
async function main() {
  try {
    // 1. 이미지 검색
    const images = await searchImages(keyword, layout);
    
    // 2. 다운로드
    console.log(`\n📥 이미지 다운로드 중...`);
    for (const img of images) {
      const filepath = path.join(CONFIG.OUTPUT_DIR, img.filename);
      await downloadImage(img.url, filepath);
      img.filepath = filepath;
    }
    
    // 3. 최적화
    if (shouldOptimize) {
      console.log(`\n⚡ 이미지 최적화 중...`);
      for (const img of images) {
        const optimizedPath = img.filepath.replace('.jpg', '-optimized.jpg');
        await optimizeImage(img.filepath, optimizedPath);
        img.filepath = optimizedPath;
      }
    }
    
    // 4. HTML 생성
    console.log(`\n📝 HTML 코드 생성 중...`);
    const html = generateHTML(images, layout, addCaption);
    
    // 5. 클립보드에 복사 (macOS)
    try {
      await execPromise(`echo '${html.replace(/'/g, "'\\''")}' | pbcopy`);
      console.log(`\n✅ HTML 코드가 클립보드에 복사되었습니다!`);
    } catch {
      console.log(`\n✅ HTML 코드:\n`);
      console.log(html);
    }
    
    // 6. 파일로 저장
    const htmlPath = path.join(CONFIG.OUTPUT_DIR, `${sanitizeFilename(keyword)}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML 파일 저장: ${htmlPath}`);
    
    console.log(`\n🎉 완료! 이미지는 ${CONFIG.OUTPUT_DIR} 폴더에 저장되었습니다.`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
