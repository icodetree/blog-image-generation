/**
 * 블로그 글 분석기 (OpenAI GPT)
 * 
 * HTML 블로그 글을 분석하여:
 * 1. 섹션별로 분리
 * 2. 이미지 삽입이 필요한 위치 결정
 * 3. 검색 키워드 추출
 * 4. 레이아웃 타입 추천
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `당신은 티스토리 블로그 글 분석 전문가입니다.

아래 블로그 글(HTML)을 분석하여, 이미지를 삽입하면 좋을 위치를 찾고 JSON으로 응답해주세요.

## 규칙
1. 글의 각 주요 섹션(h2, h3 등의 제목 기준) 사이에 이미지 삽입점을 제안
2. 이미 이미지가 있는 섹션은 건너뛰기
3. 각 삽입점에 대해 적절한 영어 검색 키워드, 한국어 캡션, 레이아웃 타입을 제안
4. 레이아웃 타입: "image-single-landscape" (1장), "image-grid-2" (2장 비교), "image-grid-3" (3장, 1+2), "image-compare" (Before/After)
5. 글 분위기와 내용에 맞는 이미지 키워드를 영어로 추출 (Unsplash 검색용)
6. 삽입점은 최대 5~7개로 제한 (너무 많으면 글 가독성 저하)

## 응답 형식 (JSON만 응답, 다른 텍스트 없이)
{
  "title": "글 제목",
  "sections": [
    {
      "insertAfter": "이미지를 삽입할 위치 바로 앞의 HTML 태그나 텍스트 (고유하게 식별 가능한 부분)",
      "searchKeywords": ["keyword1", "keyword2"],
      "layout": "image-single-landscape",
      "caption": "한국어 캡션 텍스트",
      "altText": "이미지 alt 텍스트",
      "reason": "왜 여기에 이미지가 필요한지 간단 설명"
    }
  ]
}`;

/**
 * 블로그 글 분석
 * @param {string} htmlContent - HTML 형식의 블로그 글
 * @returns {Object} 분석 결과 (삽입점 목록)
 */
async function analyzeBlogPost(htmlContent) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: htmlContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`✅ 분석 완료: ${result.sections?.length || 0}개 이미지 삽입점 발견`);
    return result;
  } catch (error) {
    console.error('❌ 글 분석 오류:', error.message);
    throw new Error(`글 분석 실패: ${error.message}`);
  }
}

/**
 * 간단한 규칙 기반 분석 (API 키 없을 때 fallback)
 * @param {string} htmlContent
 * @returns {Object}
 */
function analyzeBlogPostSimple(htmlContent) {
  const sections = [];
  
  // h2, h3 태그 기반으로 섹션 분리
  const headingRegex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
  let match;
  let index = 0;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();
    
    // 이미 이미지가 가까이 있는지 확인
    const surroundingText = htmlContent.substring(
      Math.max(0, match.index - 200),
      Math.min(htmlContent.length, match.index + match[0].length + 500)
    );
    
    if (surroundingText.includes('<img') || surroundingText.includes('blog-image-container')) {
      continue;
    }

    // 키워드 추출 (한글 단어 추출)
    const koreanWords = headingText.match(/[가-힣]+/g) || [];
    const englishWords = headingText.match(/[a-zA-Z]+/g) || [];
    
    sections.push({
      insertAfter: match[0],
      searchKeywords: englishWords.length > 0 
        ? englishWords.slice(0, 2) 
        : koreanWords.slice(0, 2),
      layout: index % 3 === 0 ? 'image-single-landscape' : 'image-grid-2',
      caption: headingText,
      altText: headingText,
      reason: `"${headingText}" 섹션 시각적 보강`
    });
    
    index++;
  }

  return {
    title: '분석된 블로그 글',
    sections: sections.slice(0, 7) // 최대 7개
  };
}

module.exports = { analyzeBlogPost, analyzeBlogPostSimple };
