/**
 * HTML 빌더
 * 
 * reference/image-layout-classes.css 클래스를 사용하여
 * 이미지 섹션 HTML을 생성하고 블로그 글에 삽입합니다.
 */

/**
 * 레이아웃 타입별 HTML 생성
 * @param {string} layout - 레이아웃 클래스명
 * @param {Object[]} images - 이미지 정보 배열 [{url, alt}]
 * @param {string} caption - 캡션 텍스트
 * @returns {string} HTML 코드
 */
function generateImageSection(layout, images, caption) {
  if (!images || images.length === 0) return '';

  switch (layout) {
    case 'image-single-landscape':
      return buildSingleLandscape(images[0], caption);
    case 'image-single-portrait':
      return buildSinglePortrait(images[0], caption);
    case 'image-grid-2':
      return buildGrid(images, 2, caption);
    case 'image-grid-3':
      return buildGrid(images, 3, caption);
    case 'image-grid-4':
      return buildGrid(images, 4, caption);
    case 'image-compare':
      return buildCompare(images, caption);
    default:
      return buildSingleLandscape(images[0], caption);
  }
}

function buildSingleLandscape(image, caption) {
  if (!image) return '';
  return `
<div class="blog-image-container image-single-landscape">
  <img src="${image.url}" alt="${image.alt || caption}" loading="lazy">
  ${caption ? `<p class="image-caption">${caption}</p>` : ''}
</div>`;
}

function buildSinglePortrait(image, caption) {
  if (!image) return '';
  return `
<div class="blog-image-container image-single-portrait">
  <img src="${image.url}" alt="${image.alt || caption}" loading="lazy">
  ${caption ? `<p class="image-caption">${caption}</p>` : ''}
</div>`;
}

// 통합 그리드 빌더 (2, 3, 4)
function buildGrid(images, count, caption) {
  // 필요한 개수만큼 슬라이스 (부족하면 있는 만큼만)
  const targetImages = images.slice(0, count);
  if (targetImages.length === 0) return '';

  const imgs = targetImages.map(img => 
    `  <img src="${img.url}" alt="${img.alt || caption}" loading="lazy">`
  ).join('\n');
  
  // 캡션을 컨테이너 안으로 이동 (CSS grid-column: 1/-1 적용을 위함)
  return `
<div class="blog-image-container image-grid-${count}">
${imgs}
  ${caption ? `<p class="image-caption">${caption}</p>` : ''}
</div>`;
}

function buildCompare(images, caption) {
  if (images.length < 2) return buildSingleLandscape(images[0], caption);
  
  const labels = caption && caption.includes('vs') 
    ? caption.split('vs').map(s => s.trim())
    : ['Before', 'After'];
    
  return `
<div class="blog-image-container image-compare">
  <div class="image-compare-item">
    <p class="image-compare-label">${labels[0] || 'Before'}</p>
    <img src="${images[0].url}" alt="${images[0].alt || labels[0]}" loading="lazy">
  </div>
  <div class="image-compare-item">
    <p class="image-compare-label">${labels[1] || 'After'}</p>
    <img src="${images[1].url}" alt="${images[1].alt || labels[1]}" loading="lazy">
  </div>
</div>`;
}

/**
 * 원본 HTML에 이미지 섹션 삽입
 */
function insertImageSections(originalHtml, insertions) {
  let result = originalHtml;
  // 뒤에서부터 삽입 (인덱스 밀림 방지)
  const sortedInsertions = [...insertions].sort((a, b) => {
    const posA = result.indexOf(a.insertAfter);
    const posB = result.indexOf(b.insertAfter);
    return posB - posA; 
  });

  for (const insertion of sortedInsertions) {
    if (!insertion.images || insertion.images.length === 0) continue;

    const pos = result.indexOf(insertion.insertAfter);
    if (pos === -1) {
      console.warn(`  ⚠️ 삽입점을 찾을 수 없음: "${insertion.insertAfter.substring(0, 50)}..."`);
      continue;
    }

    const insertPos = pos + insertion.insertAfter.length;
    const imageHtml = generateImageSection(
      insertion.layout,
      insertion.images,
      insertion.caption
    );

    result = result.substring(0, insertPos) + '\n' + imageHtml + '\n' + result.substring(insertPos);
  }

  return result;
}

function generateImageSectionsOnly(insertions) {
  return insertions.map((insertion, i) => {
    const html = generateImageSection(
      insertion.layout,
      insertion.images,
      insertion.caption
    );
    return {
      index: i + 1,
      insertAfter: insertion.insertAfter,
      html: html.trim(),
      reason: insertion.reason
    };
  });
}

module.exports = { 
  generateImageSection, 
  insertImageSections, 
  generateImageSectionsOnly 
};
