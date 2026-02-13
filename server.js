/**
 * 블로그 이미지 자동 삽입 도구 - Express 서버
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const { analyzeBlogPost, analyzeBlogPostSimple } = require('./lib/analyzer');
const { searchImages, downloadImage, getImageCount } = require('./lib/image-search');
const { optimizeImage, optimizeBatch } = require('./lib/optimizer');
const { generateImageSection, insertImageSections, generateImageSectionsOnly } = require('./lib/html-builder');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 출력 디렉토리의 이미지 서빙
const outputDir = path.join(__dirname, 'output', 'images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
app.use('/images', express.static(outputDir));

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
    if (useAI && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-xxxxx') {
      analysis = await analyzeBlogPost(content);
    } else {
      console.log('  ℹ️  OpenAI API 키 없음 → 규칙 기반 분석 사용');
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
    if (useAI && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-xxxxx') {
      analysis = await analyzeBlogPost(content);
    } else {
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

    for (const section of analysis.sections) {
      const imageCount = getImageCount(section.layout);
      const images = await searchImages(section.searchKeywords, imageCount);

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
    const { keywords, layout, caption } = req.body;

    const imageCount = getImageCount(layout || 'image-single-landscape');
    const images = await searchImages(keywords || ['blog'], imageCount);

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

// 서버 시작
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 블로그 이미지 도구 서버 시작!`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log(`\n설정 상태:`);
  console.log(`  OpenAI API: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-xxxxx' ? '✅ 연결됨' : '❌ 미설정 (규칙 기반 분석 사용)'}`);
  console.log(`  Unsplash API: ${process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key' ? '✅ 연결됨' : '⚠️ Source URL 폴백 사용'}`);
  console.log(`\n💡 팁: .env 파일에 API 키를 설정하면 더 정확한 분석이 가능합니다.\n`);
});
