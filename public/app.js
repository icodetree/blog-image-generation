/**
 * 블로그 이미지 자동 삽입 도구 - 프론트엔드 로직
 */

// 전역 상태
let lastAnalysis = null;
let lastResult = null;

// ==========================================
// API 호출 함수
// ==========================================

async function apiCall(endpoint, data) {
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '서버 오류가 발생했습니다.');
  }

  return response.json();
}

// ==========================================
// 핵심 기능: 분석만 하기
// ==========================================

async function handleAnalyze() {
  const content = document.getElementById('blogContent').value.trim();
  if (!content) {
    showToast('⚠️ 블로그 글을 입력해주세요.');
    return;
  }

  const useAI = document.getElementById('useAI').checked;

  showLoading('블로그 글 분석 중...');

  try {
    const result = await apiCall('analyze', { content, useAI });
    lastAnalysis = result.analysis;
    renderAnalysis(result.analysis);
    showToast(`✅ ${result.analysis.sections?.length || 0}개 이미지 삽입점 발견!`);
  } catch (error) {
    showToast(`❌ ${error.message}`);
  } finally {
    hideLoading();
  }
}

// ==========================================
// 핵심 기능: 전체 파이프라인
// ==========================================

async function handleProcess() {
  const content = document.getElementById('blogContent').value.trim();
  if (!content) {
    showToast('⚠️ 블로그 글을 입력해주세요.');
    return;
  }

  const useAI = document.getElementById('useAI').checked;
  const optimize = document.getElementById('optimize').checked;
  const useGenAI_Fallback = document.getElementById('useGenAI_Fallback').checked;

  showLoading('전체 처리 중... (분석 → 이미지 검색/생성 → HTML 생성)');

  try {
    const result = await apiCall('process', {
      content,
      useAI,
      optimize,
      fallbackToGen: useGenAI_Fallback
    });
    lastResult = result;

    // 분석 결과도 표시
    if (result.sections) {
      renderAnalysis({
        sections: result.sections.map(s => ({
          searchKeywords: [],
          layout: s.html.match(/class="[^"]*image-(\S+)/)?.[0] || '',
          caption: s.reason,
          reason: s.reason
        }))
      });
    }

    // 최종 결과 표시
    renderOutput(result);
    showToast(`✅ 완료! ${result.stats.totalSections}개 섹션, ${result.stats.totalImages}장 이미지 삽입`);
  } catch (error) {
    showToast(`❌ ${error.message}`);
  } finally {
    hideLoading();
  }
}

// ==========================================
// 빠른 이미지 섹션 생성
// ==========================================

async function handleQuickGenerate() {
  const keyword = document.getElementById('quickKeyword').value.trim();
  const layout = document.getElementById('quickLayout').value;
  const caption = document.getElementById('quickCaption').value.trim();
  const source = document.querySelector('input[name="quickSource"]:checked').value; // 'search' or 'generate'

  if (!keyword) {
    showToast('⚠️ 검색 키워드를 입력해주세요.');
    return;
  }

  showLoading(source === 'generate' ? '🎨 AI 이미지 생성 중 (Nano Banana)...' : '🔍 이미지 검색 + HTML 생성 중...');

  try {
    const result = await apiCall('generate-section', {
      keywords: keyword.split(/[,\s]+/).filter(Boolean),
      layout,
      caption,
      source // new param
    });

    // 결과 표시
    const quickResult = document.getElementById('quickResult');
    const quickCode = document.getElementById('quickCode');
    const quickPreview = document.getElementById('quickPreview');

    quickCode.textContent = result.html;
    quickPreview.innerHTML = result.html;
    quickResult.style.display = 'block';

    showToast('✅ HTML 코드 생성 완료!');
  } catch (error) {
    showToast(`❌ ${error.message}`);
  } finally {
    hideLoading();
  }
}

// ==========================================
// 렌더링 함수
// ==========================================

function renderAnalysis(analysis) {
  const panel = document.getElementById('analysisPanel');
  const container = document.getElementById('analysisResult');
  const countBadge = document.getElementById('sectionCount');

  const sections = analysis.sections || [];
  countBadge.textContent = `${sections.length}개 섹션`;

  container.innerHTML = sections.map((section, i) => `
    <div class="analysis-card">
      <div class="card-top">
        <span class="card-number">${i + 1}</span>
        <span class="card-layout">${getLayoutLabel(section.layout)}</span>
      </div>
      <div class="card-keywords">
        ${(section.searchKeywords || []).map(k => `<span class="keyword-tag">${k}</span>`).join('')}
      </div>
      <p class="card-caption">${section.caption || ''}</p>
      ${section.reason ? `<p class="card-reason">💡 ${section.reason}</p>` : ''}
    </div>
  `).join('');

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderOutput(result) {
  const panel = document.getElementById('outputPanel');
  const statsBar = document.getElementById('statsBar');
  const htmlCode = document.getElementById('fullHtmlCode');
  const previewFrame = document.getElementById('previewFrame');
  const sectionsOnly = document.getElementById('sectionsOnly');

  // 통계
  statsBar.innerHTML = `
    <div class="stat-item">
      <span>📍 삽입 섹션:</span>
      <span class="stat-value">${result.stats.totalSections}개</span>
    </div>
    <div class="stat-item">
      <span>🖼️ 이미지:</span>
      <span class="stat-value">${result.stats.totalImages}장</span>
    </div>
    <div class="stat-item">
      <span>📐 HTML 크기:</span>
      <span class="stat-value">${(result.html.length / 1024).toFixed(1)}KB</span>
    </div>
  `;

  // HTML 코드 탭
  htmlCode.textContent = result.html;

  // 프리뷰 탭
  previewFrame.innerHTML = result.html;

  // 이미지 섹션만 탭
  sectionsOnly.innerHTML = (result.sections || []).map((section, i) => `
    <div class="section-output-card">
      <div class="section-output-header">
        <span class="section-output-title">#${section.index} ${section.reason || ''}</span>
        <button class="btn btn-sm btn-ghost" onclick="copySectionHtml(${i})">📋 복사</button>
      </div>
      <pre><code>${escapeHtml(section.html)}</code></pre>
    </div>
  `).join('');

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// 탭 전환
// ==========================================

function switchTab(tabName) {
  // 탭 버튼 활성화
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');

  // 탭 컨텐츠 전환
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`tab${capitalizeFirst(tabName)}`).classList.add('active');
}

// ==========================================
// 복사 기능
// ==========================================

function copyQuickResult() {
  const code = document.getElementById('quickCode').textContent;
  copyToClipboard(code);
  showToast('📋 HTML 코드가 클립보드에 복사되었습니다!');
}

function copyFullResult() {
  if (!lastResult) return;
  copyToClipboard(lastResult.html);
  showToast('📋 전체 HTML이 클립보드에 복사되었습니다!');
}

function copySectionsOnly() {
  if (!lastResult || !lastResult.sections) return;
  const allSections = lastResult.sections.map(s => s.html).join('\n\n');
  copyToClipboard(allSections);
  showToast('📋 이미지 섹션 HTML이 클립보드에 복사되었습니다!');
}

function copySectionHtml(index) {
  if (!lastResult || !lastResult.sections[index]) return;
  copyToClipboard(lastResult.sections[index].html);
  showToast(`📋 섹션 #${index + 1} HTML이 복사되었습니다!`);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
}

// ==========================================
// 샘플 데이터
// ==========================================

function loadSample() {
  document.getElementById('blogContent').value = `<h2>맥미니 M4 리뷰: 작지만 강력한 데스크톱</h2>

<p>Apple이 2024년 하반기에 출시한 맥미니 M4는 이전 모델 대비 크기가 대폭 줄어들면서도 성능은 크게 향상된 제품입니다. 12.7cm x 12.7cm의 초소형 크기에 M4 칩을 탑재하여 일반 사용자부터 전문가까지 만족할 수 있는 성능을 제공합니다.</p>

<h3>디자인과 크기</h3>

<p>새로운 맥미니 M4는 이전 세대 대비 크기가 약 60% 줄어들었습니다. 손바닥 위에 올려놓을 수 있을 정도의 크기이며, 무게도 약 680g에 불과합니다. 알루미늄 유니바디 디자인은 여전히 프리미엄 느낌을 줍니다.</p>

<h3>M4 칩 성능</h3>

<p>M4 칩은 10코어 CPU와 10코어 GPU를 탑재하고 있습니다. 이전 세대 M2 대비 CPU 성능은 약 25%, GPU 성능은 약 35% 향상되었습니다. 16GB 통합 메모리와 함께 멀티태스킹에서도 뛰어난 성능을 보여줍니다.</p>

<h3>포트 구성</h3>

<p>맥미니 M4는 전면에 USB-C 포트 2개, 후면에 Thunderbolt 4 포트 3개, HDMI 2.1, 기가비트 이더넷, 3.5mm 오디오 잭을 제공합니다. 이전 모델 대비 전면 포트가 추가되어 접근성이 크게 개선되었습니다.</p>

<h3>전력 효율</h3>

<p>맥미니 M4의 대기 전력은 약 4W, 일반 사용 시 15W 수준입니다. 일반적인 데스크톱 PC의 대기 전력이 50W 이상인 것과 비교하면 매우 효율적입니다. 24시간 서버로 운용하더라도 월 전기료가 약 1,200원에 불과합니다.</p>

<h3>결론</h3>

<p>맥미니 M4는 작은 크기, 강력한 성능, 뛰어난 전력 효율을 갖춘 올라운드 데스크톱입니다. 일반 사무 작업부터 가벼운 영상 편집까지 충분히 커버할 수 있으며, 홈 서버 용도로도 최적의 선택입니다.</p>`;

  showToast('📋 샘플 맥미니 M4 리뷰 글이 입력되었습니다.');
}

// ==========================================
// 유틸리티
// ==========================================

function showLoading(text) {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function getLayoutLabel(layout) {
  const labels = {
    'image-single-landscape': '1장 - 가로형',
    'image-single-portrait': '1장 - 세로형',
    'image-grid-2': '2장 - 가로 2개',
    'image-grid-3': '3장 - 가로 3개',
    'image-grid-4': '4장 - 가로 4개',
    'image-compare': '비교형'
  };
  return labels[layout] || layout;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
