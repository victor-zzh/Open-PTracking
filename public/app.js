// State
let currentSnapshot = null;
let currentTab = 'markdown';

// DOM elements
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const platformBadge = document.getElementById('platformBadge');
const platformLabel = document.getElementById('platformLabel');
const loadingSection = document.getElementById('loadingSection');
const loadingText = document.getElementById('loadingText');
const errorSection = document.getElementById('errorSection');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const markdownView = document.getElementById('markdownView');
const jsonView = document.getElementById('jsonView');
const jsonCode = document.getElementById('jsonCode');
const cachedBadge = document.getElementById('cachedBadge');
const metaInfo = document.getElementById('metaInfo');
const tabMarkdown = document.getElementById('tabMarkdown');
const tabJson = document.getElementById('tabJson');

// Platform detection for badge (client-side preview)
const platformPatterns = [
  { pattern: /xiaohongshu\.com|xhslink\.com/, label: '小红书' },
  { pattern: /mp\.weixin\.qq\.com/, label: '公众号' },
  { pattern: /twitter\.com|x\.com/, label: 'Twitter' },
  { pattern: /producthunt\.com/, label: 'Product Hunt' },
  { pattern: /github\.com/, label: 'GitHub' },
];

urlInput.addEventListener('input', () => {
  const url = urlInput.value.trim();
  if (!url) {
    platformBadge.classList.add('hidden');
    return;
  }
  for (const { pattern, label } of platformPatterns) {
    if (pattern.test(url)) {
      platformLabel.textContent = label;
      platformBadge.classList.remove('hidden');
      return;
    }
  }
  platformBadge.classList.add('hidden');
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startAnalysis();
});

analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
  const url = urlInput.value.trim();
  if (!url) return;

  // Reset UI
  hideAll();
  showLoading();
  analyzeBtn.disabled = true;

  const loadingMessages = [
    'Fetching page content...',
    'Extracting structured data...',
    'Analyzing product information...',
    'Generating competitive snapshot...',
  ];
  let msgIndex = 0;
  loadingText.textContent = loadingMessages[0];
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[msgIndex];
  }, 2000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    clearInterval(msgInterval);

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Analysis failed', data.error || 'Error');
      return;
    }

    currentSnapshot = data;

    if (data.cached) {
      cachedBadge.classList.remove('hidden');
      cachedBadge.textContent = `Cached · ${new Date(data.cachedAt).toLocaleString()}`;
    } else {
      cachedBadge.classList.add('hidden');
    }

    renderResults(data);
    loadingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    switchTab('markdown'); // Reset to markdown view
  } catch (err) {
    clearInterval(msgInterval);
    showError('Network error. Please check your connection and try again.', 'Connection Error');
  } finally {
    analyzeBtn.disabled = false;
  }
}

function renderResults(data) {
  // Render markdown
  const md = data.markdown || '';
  if (md) {
    markdownView.innerHTML = marked.parse(md);
  } else {
    // Build from JSON if no markdown
    markdownView.innerHTML = buildFallbackHtml(data);
  }

  // Render JSON
  jsonCode.textContent = JSON.stringify(data, null, 2);
  hljs.highlightElement(jsonCode);

  // Meta info
  const meta = data.meta || {};
  const source = data.source || {};
  metaInfo.innerHTML = `
    <span>⏱ ${((meta.processingTime || 0) / 1000).toFixed(1)}s</span>
    <span>📡 ${source.platform || 'Web'}</span>
    <span>🌐 ${meta.language === 'zh' ? '中文' : 'English'}</span>
    <span>🎯 ${Math.round((meta.confidence || 0) * 100)}% confidence</span>
    ${data.warning ? `<span class="text-amber-500">⚠ ${data.warning}</span>` : ''}
  `;
}

function buildFallbackHtml(data) {
  const p = data.product || {};
  const a = data.analysis || {};
  const pricing = a.pricing || {};
  const sentiment = a.sentiment || {};

  let html = `<h1>${p.name || 'Unknown Product'}</h1>`;
  html += `<p><strong>Tagline:</strong> ${p.tagline || 'N/A'}</p>`;
  html += '<hr>';
  html += '<h2>Overview</h2>';
  html += `<ul><li><strong>Founded:</strong> ${p.founded || 'Unknown'}</li>`;
  html += `<li><strong>Target Users:</strong> ${(a.targetUsers || []).join(', ') || 'Unknown'}</li>`;
  html += `<li><strong>Category:</strong> ${(a.category || []).join(', ') || 'Uncategorized'}</li></ul>`;
  html += '<hr>';

  html += '<h2>Pricing</h2>';
  if (pricing.tiers && pricing.tiers.length > 0) {
    html += '<table><tr><th>Tier</th><th>Price</th></tr>';
    for (const t of pricing.tiers) {
      html += `<tr><td>${t.name}</td><td>${t.price === 0 ? 'Free' : '$' + t.price}</td></tr>`;
    }
    html += '</table>';
  } else {
    html += `<p>Model: ${pricing.model || 'unknown'}</p>`;
  }
  html += '<hr>';

  html += '<h2>Key Features</h2>';
  if (a.features && a.features.length > 0) {
    html += '<ol>';
    for (const f of a.features) html += `<li>${f}</li>`;
    html += '</ol>';
  }
  html += '<hr>';

  if (sentiment.score !== undefined) {
    html += '<h2>User Sentiment</h2>';
    html += `<p><strong>Score:</strong> ${Math.round(sentiment.score * 100)}% positive</p>`;
  }

  return html;
}

function switchTab(tab) {
  currentTab = tab;
  if (tab === 'markdown') {
    markdownView.classList.remove('hidden');
    jsonView.classList.add('hidden');
    tabMarkdown.classList.add('tab-active');
    tabJson.classList.remove('tab-active');
  } else {
    markdownView.classList.add('hidden');
    jsonView.classList.remove('hidden');
    tabMarkdown.classList.remove('tab-active');
    tabJson.classList.add('tab-active');
  }
}

function showLoading() {
  loadingSection.classList.remove('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}

function showError(message, title) {
  loadingSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
  errorMessage.textContent = message;
  errorTitle.textContent = title || 'Error';
}

function hideAll() {
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}
