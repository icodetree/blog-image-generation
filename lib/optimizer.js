/**
 * 이미지 최적화 (Sharp)
 * 
 * - 리사이즈 (최대 1200px 너비)
 * - WebP 변환 (85% 품질)
 * - 파일 용량 최적화
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  MAX_WIDTH: 1200,
  QUALITY: 85,
  FORMAT: 'webp'
};

/**
 * 이미지 최적화
 * @param {string} inputPath - 원본 이미지 경로
 * @param {Object} options - 최적화 옵션
 * @returns {Object} 최적화 결과 (경로, 원본 크기, 최적화 크기, 감소율)
 */
async function optimizeImage(inputPath, options = {}) {
  const maxWidth = options.maxWidth || CONFIG.MAX_WIDTH;
  const quality = options.quality || CONFIG.QUALITY;
  const format = options.format || CONFIG.FORMAT;

  const ext = format === 'webp' ? '.webp' : '.jpg';
  const outputPath = inputPath.replace(/\.[^.]+$/, `-optimized${ext}`);

  try {
    const inputStats = fs.statSync(inputPath);
    const inputSize = inputStats.size;

    let pipeline = sharp(inputPath)
      .resize(maxWidth, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      });

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    await pipeline.toFile(outputPath);

    const outputSize = fs.statSync(outputPath).size;
    const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log(`  ✓ 최적화: ${path.basename(outputPath)} (${(inputSize / 1024).toFixed(0)}KB → ${(outputSize / 1024).toFixed(0)}KB, ${reduction}% 감소)`);

    return {
      path: outputPath,
      originalSize: inputSize,
      optimizedSize: outputSize,
      reductionPercent: parseFloat(reduction),
      format
    };
  } catch (error) {
    console.error(`  ⚠️ 최적화 실패: ${path.basename(inputPath)} - ${error.message}`);
    // 최적화 실패 시 원본 반환
    return {
      path: inputPath,
      originalSize: fs.statSync(inputPath).size,
      optimizedSize: fs.statSync(inputPath).size,
      reductionPercent: 0,
      format: path.extname(inputPath).slice(1)
    };
  }
}

/**
 * 여러 이미지 일괄 최적화
 * @param {string[]} inputPaths - 이미지 경로 배열
 * @param {Object} options - 최적화 옵션
 * @returns {Object[]} 최적화 결과 배열
 */
async function optimizeBatch(inputPaths, options = {}) {
  console.log(`\n⚡ ${inputPaths.length}개 이미지 최적화 중...`);
  
  const results = [];
  for (const inputPath of inputPaths) {
    const result = await optimizeImage(inputPath, options);
    results.push(result);
  }

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
  const totalReduction = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);

  console.log(`\n📊 전체 최적화 결과: ${(totalOriginal / 1024).toFixed(0)}KB → ${(totalOptimized / 1024).toFixed(0)}KB (${totalReduction}% 감소)`);

  return results;
}

module.exports = { optimizeImage, optimizeBatch };
