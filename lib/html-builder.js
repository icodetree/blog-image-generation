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
  switch (layout) {
    case 'image-single-landscape':
      return buildSingleLandscape(images[0], caption);
    case 'image-single-portrait':
      return buildSinglePortrait(images[0], caption);
    case 'image-grid-2':
      return buildGrid2(images.slice(0, 2), caption);
    case 'image-grid-3':
      return buildGrid3(images.slice(0, 3), caption);
    case 'image-grid-4':
      return buildGrid4(images.slice(0, 4), caption);
    case 'image-compare':
      return buildCompare(images.slice(0, 2), caption);
    default:
      return buildSingleLandscape(images[0], caption);
  }
}

function buildSingleLandscape(image, caption) {
  return `
<div class="blog-image-container image-single-landscape">
  <img src="${image.url}" alt="${image.alt || caption}" loading="lazy">
  ${caption ? `<p class="image-caption">${caption}</p>` : ''}
</div>`;
}

function buildSinglePortrait(image, caption) {
  return `
<div class="blog-image-container image-single-portrait">
  <img src="${image.url}" alt="${image.alt || caption}" loading="lazy">
  ${caption ? `<p class="image-caption">${caption}</p>` : ''}
</div>`;
}

function buildGrid2(images, caption) {
  const imgs = images.map(img => 
    `  <img src="${img.url}" alt="${img.alt || caption}" loading="lazy">`
  ).join('\n');
  
  return `
<div class="blog-image-container image-grid-2">
${imgs}
</div>
${caption ? `<p class="image-caption">${caption}</p>` : ''}`;
}

function buildGrid3(images, caption) {
  const imgs = images.map(img => 
    `  <img src="${img.url}" alt="${img.alt || caption}" loading="lazy">`
  ).join('\n');
  
  return `
<div class="blog-image-container image-grid-3">
${imgs}
</div>
${caption ? `<p class="image-caption">${caption}</p>` : ''}`;
}

function buildGrid4(images, caption) {
  const imgs = images.map(img => 
    `  <img src="${img.url}" alt="${img.alt || caption}" loading="lazy">`
  ).join('\n');
  
  return `
<div class="blog-image-container image-grid-4">
${imgs}
</div>
${caption ? `<p class="image-caption">${caption}</p>` : ''}`;
}

function buildCompare(images, caption) {
  const labels = caption ? caption.split(' vs ') : ['Before', 'After'];
  return `
<div class="blog-image-container image-compare">
  <div class="image-compare-item">
    <p class="image-compare-label">❌ ${labels[0] || 'Before'}</p>
    <img src="${images[0].url}" alt="${images[0].alt || labels[0]}" loading="lazy">
  </div>
  <div class="image-compare-item">
    <p class="image-compare-label">✅ ${labels[1] || 'After'}</p>
    <img src="${images[1].url}" alt="${images[1].alt || labels[1]}" loading="lazy">
  </div>
</div>`;
}

/**
 * 원본 HTML에 이미지 섹션 삽입
 * @param {string} originalHtml - 원본 블로그 HTML
 * @param {Object[]} insertions - 삽입할 이미지 섹션 정보
 * @returns {string} 이미지가 삽입된 최종 HTML
 */
function insertImageSections(originalHtml, insertions) {
  let result = originalHtml;

  // 뒤에서부터 삽입 (인덱스 밀림 방지)
  const sortedInsertions = [...insertions].sort((a, b) => {
    const posA = result.indexOf(a.insertAfter);
    const posB = result.indexOf(b.insertAfter);
    return posB - posA; // 뒤에서부터
  });

  for (const insertion of sortedInsertions) {
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

/**
 * 이미지 URL만 교체 가능한 템플릿 형태로 출력
 * (이미지 호스팅 URL을 나중에 교체하기 위함)
 */
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
