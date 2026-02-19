/**
 * 블로그 글 분석기 (OpenAI GPT / Anthropic Claude / Marker)
 * 
 * HTML 블로그 글을 분석하여:
 * 1. 섹션별로 분리
 * 2. 이미지 삽입이 필요한 위치 결정
 * 3. 검색 키워드 추출 (영문 변환 포함)
 * 4. 레이아웃 타입 추천 (다중 이미지 선호)
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// API 키 확인 및 클라이언트 초기화
const { openai, anthropic, activeProvider } = require('./llm');

// API 키 확인 및 클라이언트 초기화 (lib/llm.js 위임)
const isAnthropicKey = activeProvider === 'anthropic';

if (activeProvider !== 'none') {
  console.log(`  🤖 AI Analyzer Ready (${activeProvider})`);
}

const ANALYSIS_PROMPT = `당신은 티스토리 블로그 글 분석 전문가입니다.

아래 블로그 글(HTML)을 분석하여, 이미지를 삽입하면 좋을 위치를 찾고 JSON으로 응답해주세요.

## 핵심 규칙 (User Request)
1. **섹션별 최소 2개 이상의 이미지**: 각 섹션의 내용을 분석하여 **최소 2개, 권장 3~4개의 이미지**를 추출하세요.
2. **다중 이미지 레이아웃 선호**: 1장짜리(single)보다는 **2장(grid-2), 3장(grid-3), 4장(grid-4)** 배치를 적극 권장합니다.
3. **영문 키워드**: Unsplash 검색 정확도를 위해 키워드는 반드시 **영어(English)**로 변환하여 제공하세요. (예: "철거" -> "demolition construction", "지원금" -> "money support")
4. **구체적 키워드**: 추상적인 단어보다 시각적으로 묘사 가능한 구체적 상황을 키워드로 잡으세요.

## 레이아웃 가이드
- "image-grid-2": 2개의 이미지를 나란히 배치
- "image-grid-3": 3개의 이미지를 나란히 배치
- "image-grid-4": 4개의 이미지를 배치
- "image-compare": 2개의 이미지를 비교 (Before/After 등)
- "image-single-landscape": 정말 중요한 메인 이미지일 때만 사용

## 응답 형식 (JSON)
{
  "title": "글 제목",
  "sections": [
    {
      "insertAfter": "이미지를 삽입할 위치 앞의 HTML 태그나 텍스트 (Unique Identifier)",
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "layout": "image-grid-3",
      "caption": "섹션 전체를 아우르는 한국어 캡션",
      "altText": "이미지 설명",
      "reason": "이미지 추천 이유"
    }
  ]
}`;

/**
 * 블로그 글 분석 (전체 래퍼)
 * 1. 마커(<!-- IMAGE: ... -->)가 있으면 AI 분석 없이 마커 사용 (토큰 절약)
 * 2. 없으면 AI 분석 실행
 */
async function analyzeBlogPost(htmlContent) {
  // 1. 마커 우선 확인
  const markerResult = analyzeWithMarkers(htmlContent);
  if (markerResult.sections.length > 0) {
    console.log(`⚡ 마커 감지됨: AI 분석을 건너뛰고 ${markerResult.sections.length}개 섹션을 생성합니다.`);
    return markerResult;
  }

  // 2. AI 분석
  try {
    if (isAnthropicKey) {
      return analyzeWithClaude(htmlContent);
    } else {
      return analyzeWithGPT(htmlContent);
    }
  } catch (error) {
    console.error('❌ AI 글 분석 오류:', error.message);
    throw new Error(`AI 분석 실패: ${error.message}`);
  }
}

/**
 * 마커 기반 분석 (0 토큰)
 * 형식: <!-- IMAGE: keywords="desk setup, mac mini", layout="image-grid-3" -->
 */
function analyzeWithMarkers(htmlContent) {
  const markerRegex = /<!--\s*IMAGE:\s*(.*?)\s*-->/gi;
  const sections = [];
  let match;

  while ((match = markerRegex.exec(htmlContent)) !== null) {
    const content = match[1];
    const section = {
      insertAfter: match[0], // 주석 바로 뒤에 삽입
      searchKeywords: [],
      layout: 'image-grid-2', // 기본값
      caption: '',
      reason: '사용자 지정 마커'
    };

    // 속성 파싱 (간단한 정규식 파서)
    const keywordsMatch = content.match(/keywords=["'](.*?)["']/);
    if (keywordsMatch) {
      section.searchKeywords = keywordsMatch[1].split(',').map(s => s.trim());
    }

    const layoutMatch = content.match(/layout=["'](.*?)["']/);
    if (layoutMatch) {
      section.layout = layoutMatch[1];
    }

    const captionMatch = content.match(/caption=["'](.*?)["']/);
    if (captionMatch) {
      section.caption = captionMatch[1];
      section.altText = captionMatch[1];
    }

    const sourceMatch = content.match(/source=["'](.*?)["']/);
    if (sourceMatch) {
      section.source = sourceMatch[1]; // 'generate' or 'search'
    }

    if (section.searchKeywords.length > 0) {
      sections.push(section);
    }
  }

  return {
    title: '마커 기반 분석 결과',
    sections
  };
}

async function analyzeWithGPT(htmlContent) {
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
  console.log(`✅ GPT 분석 완료: ${result.sections?.length || 0}개 섹션 발견`);
  return result;
}

async function analyzeWithClaude(htmlContent) {
  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4000,
    temperature: 0.3,
    system: ANALYSIS_PROMPT + "\n\n반드시 JSON 형식으로만 응답하세요.",
    messages: [
      { role: "user", content: htmlContent }
    ]
  });

  const content = msg.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude 응답에서 JSON을 찾을 수 없습니다.");
  }

  const result = JSON.parse(jsonMatch[0]);
  console.log(`✅ Claude 분석 완료: ${result.sections?.length || 0}개 섹션 발견`);
  return result;
}

/**
 * 간단한 규칙 기반 분석 (API 키 없을 때 fallback)
 */
function analyzeBlogPostSimple(htmlContent) {
  // 마커가 있는지 먼저 확인 (Fallback에서도 마커 지원)
  const markerResult = analyzeWithMarkers(htmlContent);
  if (markerResult.sections.length > 0) {
    console.log(`⚡ 마커 감지됨 (Simple Mode): ${markerResult.sections.length}개 섹션을 생성합니다.`);
    return markerResult;
  }

  console.log('⚠️ API 키 없음: 규칙 기반 분석 실행 (영문 변환 불가, 정확도 낮음)');
  const sections = [];

  const headingRegex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
  let match;
  let index = 0;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();

    const surroundingText = htmlContent.substring(
      Math.max(0, match.index - 200),
      Math.min(htmlContent.length, match.index + match[0].length + 500)
    );

    if (surroundingText.includes('<img') || surroundingText.includes('blog-image-container')) {
      continue;
    }

    const keywords = [headingText, headingText + " detail", headingText + " background"];
    const layoutType = index % 2 === 0 ? 'image-grid-3' : 'image-grid-2';

    sections.push({
      insertAfter: match[0],
      searchKeywords: keywords,
      layout: layoutType,
      caption: headingText,
      altText: headingText,
      reason: `규칙 기반 자동 추천 (${headingText})`
    });
    index++;
  }

  return {
    title: '분석된 블로그 글 (규칙 기반)',
    sections: sections.slice(0, 7)
  };
}

module.exports = { analyzeBlogPost, analyzeBlogPostSimple };
