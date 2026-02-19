/**
 * 무료 스톡 이미지 검색 및 생성 (Multi-Provider Support)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const UnsplashProvider = require('./providers/unsplash');
const GoogleGenAIProvider = require('./providers/google-genai');
const PixabayProvider = require('./providers/pixabay');
const PexelsProvider = require('./providers/pexels');
const { translateKeywords } = require('./translator');

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'images');

// Initialize Providers
const providers = {
  unsplash: new UnsplashProvider(),
  pixabay: new PixabayProvider(),
  pexels: new PexelsProvider(),
  googleGen: new GoogleGenAIProvider(), // Manual use only
};

// Fallback search placeholder
const searchPlaceholder = (query, count) => {
  const images = [];
  for (let i = 0; i < count; i++) {
    const text = encodeURIComponent(query.substring(0, 20));
    images.push({
      id: `placeholder-${Date.now()}-${i}`,
      url: `https://placehold.co/1200x800/2a2a3a/6366f1?text=${text}`,
      smallUrl: `https://placehold.co/400x300/2a2a3a/6366f1?text=${text}`,
      thumbUrl: `https://placehold.co/200x150/2a2a3a/6366f1?text=${text}`,
      alt: query,
      credit: { name: 'Placeholder', link: '#' },
      width: 1200,
      height: 800,
      provider: 'Placeholder'
    });
  }
  return images;
};

/**
 * 이미지 검색 (Priority: Unsplash -> Pixabay -> Pexels -> Placeholder)
 * *Note: Google GenAI is NOT used here automatically.*
 * @param {string[]} keywords 
 * @param {number} count 
 * @param {Object} options - { fallbackToGen: boolean }
 */
async function searchImages(keywords, count = 1, options = {}) {
  // 1. Auto Translation
  const queryKeywords = await translateKeywords(keywords);
  const query = queryKeywords.join(' ');

  // Helper to check results
  const checkResults = (images) => images && images.length > 0;

  // 2. Unsplash
  console.log(`  🔍 Trying Unsplash for "${query}"...`);
  try {
    const images = await providers.unsplash.search(query, count);
    if (checkResults(images)) return images;
  } catch (e) {
    console.error(`  ⚠️ Unsplash failed: ${e.message}`);
  }

  // 3. Pixabay
  console.log(`  🔍 Trying Pixabay for "${query}"...`);
  try {
    const images = await providers.pixabay.search(query, count);
    if (checkResults(images)) return images;
  } catch (e) {
    console.error(`  ⚠️ Pixabay failed: ${e.message}`);
  }

  // 4. Pexels
  console.log(`  🔍 Trying Pexels for "${query}"...`);
  try {
    const images = await providers.pexels.search(query, count);
    if (checkResults(images)) return images;
  } catch (e) {
    console.error(`  ⚠️ Pexels failed: ${e.message}`);
  }

  // 5. Fallback to Generation (Conditional)
  if (options.fallbackToGen) {
    console.log(`  ⚠️ 검색 결과 없음 & Fallback 활성화됨. Gemini 생성 시도...`);
    try {
      const images = await generateImages(query, count);
      if (checkResults(images)) return images;
    } catch (e) {
      console.error(`  ❌ Generation Fallback failed: ${e.message}`);
    }
  }

  // 6. Fallback to Placeholder
  console.log('  ⚠️ 모든 이미지 확보 실패, Fallback (Placeholder) 사용.');
  return searchPlaceholder(query, count);
}

/**
 * 이미지 생성 (Manual Call Only)
 */
async function generateImages(prompt, count = 1) {
  console.log(`  🎨 Generating images for "${prompt}" (Token Usage)...`);
  try {
    return await providers.googleGen.generate(prompt, count);
  } catch (e) {
    console.error(`  ❌ Generation failed: ${e.message}`);
    return [];
  }
}

/**
 * 이미지 다운로드 (Existing Helper)
 */
async function downloadImage(url, filename) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filepath = path.join(OUTPUT_DIR, filename);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const request = protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, filename).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(filepath).size;
        console.log(`  ✓ 다운로드: ${filename} (${(size / 1024).toFixed(0)}KB)`);
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => { });
      reject(err);
    });
  });
}

function getImageCount(layout) {
  switch (layout) {
    case 'image-single-landscape':
    case 'image-single-portrait': return 1;
    case 'image-grid-2':
    case 'image-compare': return 2;
    case 'image-grid-3': return 3;
    case 'image-grid-4': return 4;
    default: return 1;
  }
}

module.exports = { searchImages, generateImages, downloadImage, getImageCount };
