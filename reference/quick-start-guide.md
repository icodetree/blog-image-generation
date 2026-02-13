# 🚀 블로그 이미지 자동화 - 10초 만에 끝내기

## ⚡ 가장 빠른 방법 (지금 바로 사용)

### 1단계: Claude에게 이렇게 요청
```
"맥미니 M4" 키워드로 이미지 3장 검색해서 
2장 레이아웃(image-grid-2) HTML 만들어줘
```

### 2단계: Claude가 생성한 HTML을 복사

### 3단계: 티스토리 에디터에 붙여넣기

### 끝! 🎉

---

## 📋 자주 쓰는 프롬프트 템플릿

### 패턴 1: 단일 이미지
```
"[키워드]" 이미지 1장 검색해서 
image-single-landscape HTML 만들어줘
```

### 패턴 2: 좌우 비교
```
"[키워드1] vs [키워드2]" 이미지 2장 검색해서 
image-grid-2 HTML 만들어줘
```

### 패턴 3: 상세 설명 (1+2)
```
"[키워드]" 이미지 3장 검색해서 
image-grid-3 HTML 만들어줘
```

### 패턴 4: Before/After
```
"[Before 키워드]" vs "[After 키워드]" 이미지 2장 검색해서 
image-compare HTML 만들어줘
```

---

## 💡 실제 사용 예시

### 예시 1: 맥미니 외관
**프롬프트:**
```
"Mac mini M4 desktop" 키워드로 이미지 1장 검색해서 
image-single-landscape HTML 만들어줘
```

**결과 (Claude가 자동 생성):**
```html
<div class="blog-image-container image-single-landscape">
  <img src="[이미지 URL]" alt="맥미니 M4 외관" loading="lazy">
  <p class="image-caption">맥미니 M4는 초소형 크기에 강력한 성능</p>
</div>
```

---

### 예시 2: M4 vs M1 비교
**프롬프트:**
```
"Mac mini M4" vs "Mac mini M1" 이미지 2장 검색해서 
image-grid-2 HTML 만들어줘
```

**결과:**
```html
<div class="blog-image-container image-grid-2">
  <img src="[M4 이미지 URL]" alt="맥미니 M4" loading="lazy">
  <img src="[M1 이미지 URL]" alt="맥미니 M1" loading="lazy">
</div>
<p class="image-caption">왼쪽: M4 (2024), 오른쪽: M1 (2020)</p>
```

---

### 예시 3: 포트 상세 (3장)
**프롬프트:**
```
"Mac mini M4 ports connections" 키워드로 이미지 3장 검색해서 
image-grid-3 HTML 만들어줘
```

**결과:**
```html
<div class="blog-image-container image-grid-3">
  <img src="[메인 이미지]" alt="맥미니 M4 포트" loading="lazy">
  <img src="[상세1]" alt="썬더볼트 포트" loading="lazy">
  <img src="[상세2]" alt="HDMI 포트" loading="lazy">
</div>
<p class="image-caption">맥미니 M4 포트 구성</p>
```

---

## 🎯 시간 단축 비교

### 기존 방법 (15분)
```
1. 구글 이미지 검색 (3분)
2. 이미지 다운로드 (2분)
3. 포토샵으로 리사이즈 (5분)
4. 티스토리 업로드 (3분)
5. HTML 코드 작성 (2분)
━━━━━━━━━━━━━━━━━━━━
총 15분
```

### Claude 활용 (10초!)
```
1. Claude에게 프롬프트 입력 (5초)
2. 생성된 HTML 복사-붙여넣기 (5초)
━━━━━━━━━━━━━━━━━━━━
총 10초 ⚡
```

### 시간 절약: **99.3%** 🎉

---

## 📁 제공 파일 목록

1. **image-layout-classes.css**
   - 티스토리 공통 CSS에 추가할 클래스
   - 1장/2장/3장/4장/비교 레이아웃 모두 포함

2. **blog-image-helper.js**
   - Node.js 자동화 스크립트 (고급 사용자용)
   - 이미지 검색 + 다운로드 + 최적화 + HTML 생성

3. **image-automation-guide.md**
   - 상세 사용 가이드
   - n8n 워크플로우 예시 포함

4. **openclaw-image-sections.html**
   - 실제 블로그 글에 바로 쓸 수 있는 예시 모음

---

## 🔧 티스토리 설정 (최초 1회만)

### CSS 추가하기

1. 티스토리 관리자 → 꾸미기 → HTML/CSS 편집
2. **skin.css** 파일 열기
3. 맨 아래에 `image-layout-classes.css` 내용 복사-붙여넣기
4. 저장

**이제 모든 글에서 클래스를 사용할 수 있습니다!**

---

## 💬 호영님께 추천

### 오늘 당장 (5분)
```
1. CSS 파일을 티스토리에 추가
2. Claude에게 "맥미니 M4" 이미지 검색 요청
3. 생성된 HTML을 블로그에 붙여넣기
```

### 이번 주말 (30분)
```
1. Node.js 스크립트 세팅
2. ImageMagick 설치
3. 자동 최적화 테스트
```

### 다음 달 (n8n 마스터)
```
1. n8n 워크플로우 구축
2. 티스토리 에디터 버튼 하나로 이미지 자동 삽입
3. 완전 자동화 달성!
```

---

## 🎁 보너스: 단축키 설정

### Alfred/Raycast 단축키 (macOS)
```bash
# Alfred Workflow 예시
Keyword: imgblog
Script: echo "Claude에게 '{query}' 키워드로 이미지 검색 HTML 만들어줘"

# 사용법
imgblog 맥미니 M4
→ 클립보드에 프롬프트 복사됨
→ Claude에 붙여넣기
→ 결과 받기
```

---

## 📞 문제 해결

### Q: 이미지가 너무 크게 나와요
→ CSS에서 `max-width` 조정:
```css
.image-single-landscape {
  max-width: 800px; /* 기본: 100% */
}
```

### Q: 모바일에서 이미지가 깨져요
→ `loading="lazy"` 속성 추가 확인:
```html
<img src="..." loading="lazy">
```

### Q: 이미지 품질을 더 높이고 싶어요
→ Node.js 스크립트에서 `QUALITY: 85` → `QUALITY: 95`

---

## 🚀 다음 단계

1. ✅ CSS 추가 완료
2. ✅ Claude 활용법 숙지
3. ⬜ Node.js 스크립트 세팅
4. ⬜ n8n 워크플로우 구축
5. ⬜ **완전 자동화 달성!**

지금 바로 Claude에게 이미지 검색을 요청해보세요! 🎉
