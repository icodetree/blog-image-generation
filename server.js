/**
 * 블로그 이미지 자동 삽입 도구 - Express 서버
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const { analyzeBlogPost, analyzeBlogPostSimple } = require('./lib/analyzer');
const { searchImages, generateImages, downloadImage, getImageCount } = require('./lib/image-search');
const { optimizeImage, optimizeBatch } = require('./lib/optimizer');
const { generateImageSection, insertImageSections, generateImageSectionsOnly } = require('./lib/html-builder');

const app = express();
const PORT = process.env.PORT || 3010;

// 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 출력 디렉토리의 이미지 서빙
const outputDir = path.join(__dirname, 'output', 'images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
app.use('/images', express.static(outputDir));

// API 키 확인
const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
const hasValidKey = apiKey && apiKey !== 'sk-xxxxx';

// ==========================================
// API 엔드포인트
// ==========================================

/**
 * POST /api/analyze
 * 블로그 글 분석 → 이미지 삽입점 추출
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { content, useAI } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '블로그 글 내용을 입력해주세요.' });
    }

    console.log(`\n📝 블로그 글 분석 시작 (${content.length}자)...`);

    let analysis;
    if (useAI && hasValidKey) {
      analysis = await analyzeBlogPost(content);
    } else {
      if (!hasValidKey) console.log('  ℹ️  API 키 없음 → 규칙 기반 분석 사용');
      analysis = analyzeBlogPostSimple(content);
    }

    res.json({
      success: true,
      analysis,
      mode: useAI ? 'ai' : 'simple'
    });
  } catch (error) {
    console.error('❌ 분석 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/search-images
 * 키워드로 이미지 검색
 */
app.post('/api/search-images', async (req, res) => {
  try {
    const { keywords, count } = req.body;

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: '검색 키워드를 입력해주세요.' });
    }

    console.log(`\n🔍 이미지 검색: "${keywords.join(', ')}" (${count || 1}장)`);
    const images = await searchImages(keywords, count || 1);

    res.json({ success: true, images });
  } catch (error) {
    console.error('❌ 검색 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/process
 * 전체 파이프라인 실행: 분석 → 검색 → 최적화 → HTML 생성
 */
app.post('/api/process', async (req, res) => {
  try {
    const { content, useAI, optimize } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '블로그 글 내용을 입력해주세요.' });
    }

    console.log('\n' + '='.repeat(50));
    console.log('🚀 전체 파이프라인 시작');
    console.log('='.repeat(50));

    // 1단계: 글 분석
    console.log('\n📝 1단계: 글 분석...');
    let analysis;
    if (useAI && hasValidKey) {
      analysis = await analyzeBlogPost(content);
    } else {
      if (!hasValidKey) console.log('  ℹ️  API 키 없음 → 규칙 기반 분석 사용');
      analysis = analyzeBlogPostSimple(content);
    }

    if (!analysis.sections || analysis.sections.length === 0) {
      return res.json({
        success: true,
        message: '이미지 삽입이 필요한 섹션을 찾지 못했습니다.',
        html: content,
        sections: []
      });
    }

    // 2단계: 각 섹션에 대해 이미지 검색
    console.log(`\n🔍 2단계: ${analysis.sections.length}개 섹션 이미지 검색...`);
    const processedSections = [];

    // 옵션: AI 생성 폴백 사용 여부
    const searchOptions = {
      fallbackToGen: req.body.fallbackToGen || false
    };

    for (const section of analysis.sections) {
      const imageCount = getImageCount(section.layout);
      let images = [];

      // 마커에서 'generate' 소스를 명시했으면 바로 생성
      if (section.source === 'generate') {
        console.log(`\n🎨 명시적 생성 요청 (Marker): "${section.searchKeywords.join(' ')}"`);
        const { generateImages } = require('./lib/image-search'); // Ensure import or use top-level
        images = await generateImages(section.searchKeywords.join(' '), imageCount);
      } else {
        // 그 외에는 검색 (옵션에 따라 폴백)
        images = await searchImages(section.searchKeywords, imageCount, searchOptions);
      }

      // 3단계: 이미지 다운로드 + 최적화 (선택)
      const processedImages = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let finalUrl = img.url;

        if (optimize) {
          try {
            const filename = `${Date.now()}-${i}.jpg`;
            const downloaded = await downloadImage(img.url, filename);
            const optimized = await optimizeImage(downloaded);
            // 로컬 서버 URL로 교체
            finalUrl = `/images/${path.basename(optimized.path)}`;
          } catch (err) {
            console.warn(`  ⚠️ 이미지 처리 실패, 원본 URL 사용: ${err.message}`);
          }
        }

        processedImages.push({
          url: finalUrl,
          alt: section.altText || section.caption,
          credit: img.credit
        });
      }

      processedSections.push({
        ...section,
        images: processedImages
      });
    }

    // 4단계: HTML 생성
    console.log('\n📋 4단계: HTML 생성...');
    const resultHtml = insertImageSections(content, processedSections);
    const imageSectionsOnly = generateImageSectionsOnly(processedSections);

    console.log('\n' + '='.repeat(50));
    console.log('✅ 파이프라인 완료!');
    console.log('='.repeat(50));

    res.json({
      success: true,
      html: resultHtml,
      sections: imageSectionsOnly,
      stats: {
        totalSections: processedSections.length,
        totalImages: processedSections.reduce((sum, s) => sum + s.images.length, 0)
      }
    });
  } catch (error) {
    console.error('❌ 처리 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate-section
 * 개별 이미지 섹션 HTML 생성
 */
app.post('/api/generate-section', async (req, res) => {
  try {
    const { keywords, layout, caption, source } = req.body;

    const imageCount = getImageCount(layout || 'image-single-landscape');
    let images = [];

    if (source === 'generate') {
      console.log(`\n🎨 빠른 생성: AI 이미지 생성 요청 ("${keywords?.join(' ')}")`);
      const { generateImages } = require('./lib/image-search'); // Ensure import
      images = await generateImages(keywords?.join(' '), imageCount);

      // Generation failed (e.g., 429 or 404), fallback to placeholder to prevent UI breakage
      if (!images || images.length === 0) {
        console.warn('  ⚠️ Generation returned no images (Quota exceeded?), falling back to placeholder.');
        const { searchPlaceholder } = require('./lib/image-search'); // Need to export this or mock it
        // Actually searchPlaceholder is internal to image-search.js.
        // Let's use searchImages with a specific flag or just handle it here.
        // Better: searchImages calls generateImages.
        // Let's just manually create a placeholder here for safety.
        images = Array(imageCount).fill(0).map((_, i) => ({
          url: `https://placehold.co/800x600?text=${encodeURIComponent('Generation Warning')}`,
          alt: 'Image generation failed',
          credit: { name: 'System', link: '#' }
        }));
      }
    } else {
      // Default: Search
      images = await searchImages(keywords || ['blog'], imageCount);
    }

    const imageData = images.map(img => ({
      url: img.url,
      alt: caption || keywords?.join(' ') || 'blog image'
    }));

    const html = generateImageSection(
      layout || 'image-single-landscape',
      imageData,
      caption || ''
    );

    res.json({ success: true, html: html.trim(), images: imageData });
  } catch (error) {
    console.error('❌ 섹션 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate-image
 * 직접 이미지 생성 요청 (Gemini)
 */
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, count } = req.body;
    if (!prompt) return res.status(400).json({ error: '프롬프트를 입력해주세요.' });

    const { generateImages } = require('./lib/image-search');
    const images = await generateImages(prompt, count || 1);

    res.json({ success: true, images });
  } catch (error) {
    console.error('❌ 이미지 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 블로그 이미지 도구 서버 시작!`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log(`\n설정 상태:`);

  if (hasValidKey) {
    if (apiKey.startsWith('sk-ant-')) {
      console.log(`  AI API: ✅ Anthropic Claude (Haiku) 연결됨`);
    } else {
      console.log(`  AI API: ✅ OpenAI GPT (4o-mini) 연결됨`);
    }
  } else {
    console.log(`  AI API: ❌ 미설정 (규칙 기반 분석 사용)`);
  }

  console.log(`  Unsplash API: ${process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key' ? '✅ 연결됨' : '⚠️ Source URL 폴백 사용'}`);
  console.log(`\n💡 팁: Claude API 키(sk-ant-...)도 지원합니다.\n`);
});
