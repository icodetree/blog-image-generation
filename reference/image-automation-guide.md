# 블로그 이미지 자동화 - 완벽 가이드

## 🚀 방법 1: Claude 활용 (가장 빠름! 추천)

### 사용법
Claude에게 이렇게 요청하세요:

```
"맥미니 M4" 키워드로 이미지 3장 검색해서 
2장 레이아웃 HTML 코드 만들어줘
```

Claude가 자동으로:
1. image_search 도구로 관련 이미지 검색
2. 최적의 이미지 3장 선택
3. 반응형 HTML 코드 생성
4. 복사-붙여넣기만 하면 끝!

### 예시 프롬프트

#### 1장 레이아웃
```
"OpenClaw 설치" 키워드로 이미지 1장 검색해서 
가로형(image-single-landscape) HTML 코드 만들어줘
```

#### 2장 레이아웃 (비교)
```
"맥미니 M4 vs M1" 키워드로 이미지 2장 검색해서 
좌우 비교(image-grid-2) HTML 코드 만들어줘
```

#### 3장 레이아웃 (1+2)
```
"맥미니 사양" 키워드로 이미지 3장 검색해서 
1+2 레이아웃(image-grid-3) HTML 코드 만들어줘
```

---

## 🛠️ 방법 2: Node.js 스크립트 (완전 자동화)

### 설치
```bash
# ImageMagick 설치 (이미지 최적화용)
brew install imagemagick

# 스크립트 실행 권한 부여
chmod +x blog-image-helper.js
```

### 사용법
```bash
# 기본 사용 (2장 레이아웃)
node blog-image-helper.js "맥미니 M4"

# 1장 레이아웃 + 최적화
node blog-image-helper.js "OpenClaw" --layout=1 --optimize

# 3장 레이아웃 + 캡션
node blog-image-helper.js "맥미니 사양" --layout=3 --caption --optimize
```

### 결과물
```
blog-images/
├── macmini-m4-1.jpg          (원본)
├── macmini-m4-1-optimized.jpg (최적화, 85% 품질, WebP)
├── macmini-m4-2.jpg
├── macmini-m4-2-optimized.jpg
└── macmini-m4.html           (HTML 코드)
```

---

## ⚡ 방법 3: n8n 워크플로우 (궁극의 자동화)

### 워크플로우 구조
```
1. [Webhook] 티스토리 글 작성 시작
   ↓
2. [Claude AI] 글 내용 분석 → 필요한 이미지 키워드 추출
   ↓
3. [HTTP Request] Unsplash API 이미지 검색
   ↓
4. [Code] 이미지 다운로드 + Sharp로 WebP 변환
   ↓
5. [FTP/S3] 이미지 업로드
   ↓
6. [Claude AI] HTML 코드 생성
   ↓
7. [Webhook Response] HTML 코드 반환
```

### n8n 노드 JSON (예시)

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "blog-image",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Claude - 키워드 추출",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "method": "POST",
        "authentication": "genericCredentialType",
        "body": {
          "model": "claude-sonnet-4-20250514",
          "max_tokens": 1000,
          "messages": [
            {
              "role": "user",
              "content": "이 글에서 이미지 검색 키워드 3개 추출: {{$json.content}}"
            }
          ]
        }
      }
    },
    {
      "name": "Unsplash 검색",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.unsplash.com/search/photos",
        "qs": {
          "query": "={{$json.keywords}}",
          "per_page": 3
        }
      }
    },
    {
      "name": "이미지 다운로드 + WebP 변환",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": `
const sharp = require('sharp');
const axios = require('axios');

const images = items[0].json.results;
const outputs = [];

for (const img of images) {
  const response = await axios.get(img.urls.regular, { 
    responseType: 'arraybuffer' 
  });
  
  const optimized = await sharp(response.data)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  
  outputs.push({
    filename: img.id + '.webp',
    buffer: optimized.toString('base64')
  });
}

return outputs;
        `
      }
    },
    {
      "name": "Claude - HTML 생성",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "body": {
          "model": "claude-sonnet-4-20250514",
          "messages": [
            {
              "role": "user",
              "content": "이미지 {{$json.count}}장으로 image-grid-{{$json.count}} 레이아웃 HTML 생성"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 📊 3가지 방법 비교

| 방법 | 속도 | 자동화 | 난이도 | 추천 대상 |
|------|------|--------|--------|-----------|
| **Claude 활용** | ⭐⭐⭐⭐⭐ (10초) | ⭐⭐⭐ | ⭐ (가장 쉬움) | **모든 사용자** |
| **Node.js 스크립트** | ⭐⭐⭐⭐ (30초) | ⭐⭐⭐⭐ | ⭐⭐⭐ | 개발자 |
| **n8n 워크플로우** | ⭐⭐⭐⭐⭐ (5초) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 자동화 전문가 |

---

## 💡 호영님께 추천하는 최적의 조합

### 단계 1: 지금 당장 (Claude 활용)
```
Claude에게: "맥미니 M4" 이미지 3장 검색해서 HTML 만들어줘
→ 복사-붙여넿기
→ 완료! (10초)
```

### 단계 2: 이번 주말 (Node.js 스크립트 세팅)
```bash
npm install sharp
node blog-image-helper.js "맥미니" --optimize
→ 이미지 자동 최적화 + HTML 생성
```

### 단계 3: 다음 달 (n8n 워크플로우 구축)
```
티스토리 에디터에서 버튼 클릭
→ n8n이 자동으로 이미지 검색 + 최적화 + HTML 삽입
→ 완전 자동화 달성!
```

---

## 🎯 즉시 사용 가능한 HTML 템플릿

### 1장 레이아웃
```html
<div class="blog-image-container image-single-landscape">
  <img src="IMAGE_URL" alt="맥미니 M4">
  <p class="image-caption">맥미니 M4 외관</p>
</div>
```

### 2장 레이아웃
```html
<div class="blog-image-container image-grid-2">
  <img src="IMAGE_URL_1" alt="맥미니 M4 정면">
  <img src="IMAGE_URL_2" alt="맥미니 M4 후면">
</div>
```

### 3장 레이아웃 (1+2)
```html
<div class="blog-image-container image-grid-3">
  <img src="IMAGE_URL_1" alt="맥미니 M4 전체">
  <img src="IMAGE_URL_2" alt="맥미니 M4 포트">
  <img src="IMAGE_URL_3" alt="맥미니 M4 성능">
</div>
```

### Before/After 비교
```html
<div class="blog-image-container image-compare">
  <div class="image-compare-item">
    <p class="image-compare-label">❌ M1 8GB</p>
    <img src="IMAGE_URL_1" alt="M1 8GB">
  </div>
  <div class="image-compare-item">
    <p class="image-compare-label">✅ M4 16GB</p>
    <img src="IMAGE_URL_2" alt="M4 16GB">
  </div>
</div>
```

---

## 📌 FAQ

### Q1. 이미지 용량이 너무 큰데 자동으로 줄일 수 없나요?
→ Node.js 스크립트 사용 시 `--optimize` 옵션으로 자동 WebP 변환 (평균 70% 용량 감소)

### Q2. Unsplash 이미지 말고 내가 찍은 사진을 쓰고 싶어요
→ 이미지를 `/blog-images` 폴더에 넣고 HTML만 생성하도록 스크립트 수정 가능

### Q3. 티스토리에 이미지 업로드는 어떻게 하나요?
→ 티스토리 에디터에서 이미지 드래그 앤 드롭 → URL 복사 → HTML 템플릿에 붙여넣기
→ 또는 n8n 워크플로우로 FTP/S3 자동 업로드

---

## 🚀 다음 단계: 완전 자동화

### 목표: 키워드만 입력하면 끝
```
Input: "맥미니 M4"
  ↓
Output: 최적화된 이미지 3장 + HTML 코드
  ↓ (클립보드에 자동 복사)
티스토리 에디터에 Ctrl+V
  ↓
완료!
```

이 워크플로우를 n8n으로 구축하시면 블로그 작성 시간을 **80% 단축**할 수 있습니다!
