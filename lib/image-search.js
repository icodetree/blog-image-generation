/**
 * 무료 스톡 이미지 검색 (Unsplash API)
 * 
 * Unsplash API를 사용하여 키워드 기반 이미지를 검색합니다.
 * API 키가 없으면 Pexels 무료 이미지를 폴백으로 사용합니다.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'images');

/**
 * Unsplash API로 이미지 검색
 * @param {string[]} keywords - 검색 키워드 배열
 * @param {number} count - 필요한 이미지 수
 * @returns {Object[]} 이미지 정보 배열
 */
async function searchImages(keywords, count = 1) {
  const query = keywords.join(' ');
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (accessKey && accessKey !== 'your_unsplash_access_key') {
    return searchUnsplashAPI(query, count, accessKey);
  } else {
    console.log('  ⚠️ Unsplash API 키 없음. .env에 UNSPLASH_ACCESS_KEY를 설정해주세요.');
    return getPlaceholderImages(query, count);
  }
}

/**
 * Unsplash API 검색 (API 키 필요)
 */
async function searchUnsplashAPI(query, count, accessKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.max(count, 5)}&orientation=landscape`;
    
    const options = {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) {
            console.error('  ❌ Unsplash API 오류:', json.errors);
            return resolve(getPlaceholderImages(query, count));
          }
          
          const results = json.results || [];
          if (results.length === 0) {
            console.log(`  ⚠️ "${query}" 검색 결과 없음, 대체 키워드로 재시도...`);
            // 영어 키워드가 아닌 경우 일반적인 키워드 사용
            return resolve(getPlaceholderImages(query, count));
          }

          const images = results.slice(0, count).map((img) => ({
            id: img.id,
            url: img.urls.regular,      // 1080px 너비
            smallUrl: img.urls.small,    // 400px 너비
            thumbUrl: img.urls.thumb,    // 200px 너비
            rawUrl: img.urls.raw,        // 원본
            alt: img.alt_description || img.description || query,
            credit: {
              name: img.user.name,
              link: `${img.user.links.html}?utm_source=blog_image_tool&utm_medium=referral`
            },
            width: img.width,
            height: img.height,
            color: img.color
          }));

          console.log(`  ✅ Unsplash API: "${query}" → ${images.length}개 결과`);
          resolve(images);
        } catch (e) {
          console.error('  ❌ JSON 파싱 오류:', e.message);
          resolve(getPlaceholderImages(query, count));
        }
      });
    }).on('error', (err) => {
      console.error('  ❌ 네트워크 오류:', err.message);
      resolve(getPlaceholderImages(query, count));
    });
  });
}

/**
 * 플레이스홀더 이미지 (API 키가 없거나 검색 실패 시)
 */
function getPlaceholderImages(query, count) {
  const images = [];
  // placehold.co를 사용한 플레이스홀더
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
      height: 800
    });
  }
  console.log(`  ℹ️ 플레이스홀더 이미지 ${count}개 생성 (API 키를 설정하면 실제 이미지 사용 가능)`);
  return images;
}

/**
 * 이미지 다운로드
 * @param {string} url - 이미지 URL
 * @param {string} filename - 저장할 파일명
 * @returns {string} 저장된 파일 경로
 */
async function downloadImage(url, filename) {
  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('너무 많은 리다이렉트'));
      }

      const protocol = requestUrl.startsWith('https') ? https : require('http');
      
      protocol.get(requestUrl, (res) => {
        // 리다이렉트 처리
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          return makeRequest(res.headers.location, redirectCount + 1);
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
        fs.unlink(filepath, () => {});
        reject(err);
      });
    };

    makeRequest(url);
  });
}

/**
 * 레이아웃 타입에 따른 필요 이미지 수 반환
 */
function getImageCount(layout) {
  switch (layout) {
    case 'image-single-landscape':
    case 'image-single-portrait':
      return 1;
    case 'image-grid-2':
    case 'image-compare':
      return 2;
    case 'image-grid-3':
      return 3;
    case 'image-grid-4':
      return 4;
    default:
      return 1;
  }
}

module.exports = { searchImages, downloadImage, getImageCount };
