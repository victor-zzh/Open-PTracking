// ---- State ----
let currentTab = 'markdown';
let lastData = null;

// ---- DOM Elements ----
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const loadingText = document.getElementById('loadingText');
const errorSection = document.getElementById('errorSection');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const markdownView = document.getElementById('markdownView');
const feedbackView = document.getElementById('feedbackView');
const jsonView = document.getElementById('jsonView');
const jsonCode = document.getElementById('jsonCode');
const cachedBadge = document.getElementById('cachedBadge');
const metaInfo = document.getElementById('metaInfo');
const tabMarkdown = document.getElementById('tabMarkdown');
const tabFeedback = document.getElementById('tabFeedback');
const tabJson = document.getElementById('tabJson');
const heroSection = document.getElementById('heroSection');
const inputContainer = document.getElementById('inputContainer');

// ---- Events ----
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startAnalysis();
});
analyzeBtn.addEventListener('click', startAnalysis);

// ---- Core ----
async function startAnalysis() {
  const url = urlInput.value.trim();
  if (!url) return;

  hideAll();
  showLoading();
  analyzeBtn.disabled = true;

  const messages = [
    'Fetching page content...',
    'Extracting structured data...',
    'Analyzing product information...',
    'Generating competitive snapshot...',
  ];
  let i = 0;
  loadingText.textContent = messages[0];
  const interval = setInterval(() => {
    i = (i + 1) % messages.length;
    loadingText.textContent = messages[i];
  }, 2000);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    clearInterval(interval);

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || 'Analysis failed', data.error || 'Error');
      return;
    }

    // Collapse hero section
    heroSection.classList.add('mt-4');
    heroSection.querySelector('.relative.z-10').classList.replace('mt-16', 'mt-4');
    heroSection.querySelector('.relative.z-10').classList.replace('mb-16', 'mb-6');
    const heroH1 = heroSection.querySelector('h1');
    const heroP = heroSection.querySelector('p');
    if (heroH1) heroH1.classList.add('text-xl');
    if (heroP) heroP.classList.add('hidden');

    renderResults(data);
    loadingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    if (data.cached) {
      cachedBadge.classList.remove('hidden');
      cachedBadge.textContent = `Cached · ${new Date(data.cachedAt).toLocaleString()}`;
    } else {
      cachedBadge.classList.add('hidden');
    }

    switchTab('markdown');
  } catch {
    clearInterval(interval);
    showError('Network error. Please check your connection.', 'Connection Error');
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ---- Render ----
function renderResults(data) {
  lastData = data;
  const md = data.markdown || '';

  // Split product markdown and feedback markdown
  const feedbackMd = data.feedback?.markdown || '';
  const productMd = feedbackMd ? md.replace(feedbackMd, '') : md;

  markdownView.innerHTML = productMd ? marked.parse(productMd) : buildFallbackHtml(data);
  renderFeedback(data.feedback, data.product?.name);
  jsonCode.textContent = JSON.stringify(data, null, 2);

  const meta = data.meta || {};
  const source = data.source || {};
  metaInfo.innerHTML = [
    `<span class="inline-flex items-center gap-1">⏱ ${((meta.processingTime || 0) / 1000).toFixed(1)}s</span>`,
    `<span class="inline-flex items-center gap-1">📡 ${source.platform || 'Web'}</span>`,
    `<span class="inline-flex items-center gap-1">🌐 ${meta.language === 'zh' ? '中文' : 'English'}</span>`,
    `<span class="inline-flex items-center gap-1">🎯 ${Math.round((meta.confidence || 0) * 100)}% confidence</span>`,
    data.warning ? `<span class="inline-flex items-center gap-1 text-amber-500">⚠ ${data.warning}</span>` : '',
  ].join('');
}

function renderFeedback(feedback, productName) {
  if (!feedback || feedback.totalFound === 0) {
    feedbackView.innerHTML = `
      <div class="bg-white rounded-xl border border-border p-8 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-3 text-muted-foreground/40"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <p class="text-sm text-muted-foreground">No user feedback found across channels for "${productName || 'this product'}"</p>
        <p class="text-xs text-muted-foreground/60 mt-1">Try a more established product name</p>
      </div>`;
    return;
  }

  const aggPct = Math.round(feedback.aggregatedSentiment * 100);
  const sentimentColor = aggPct >= 65 ? 'text-green-600' : aggPct >= 40 ? 'text-amber-600' : 'text-red-600';
  const sentimentBg = aggPct >= 65 ? 'bg-green-50' : aggPct >= 40 ? 'bg-amber-50' : 'bg-red-50';

  let html = '';

  // Summary card
  html += `
    <div class="bg-white rounded-xl border border-border p-5 mb-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold">${feedback.totalFound}</span>
          <span class="text-sm text-muted-foreground">total mentions</span>
        </div>
        <div class="flex items-center gap-1">
          ${feedback.channels.map(ch => `<span class="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium">${ch.channel} · ${ch.count}</span>`).join('')}
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-sm text-muted-foreground">Sentiment</span>
          <span class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${sentimentBg} ${sentimentColor}">
            ${aggPct}% positive
          </span>
        </div>
      </div>
      <div class="flex gap-0.5 mt-3">
        <div class="h-1.5 rounded-l-full bg-green-500" style="width:${feedback.positiveCount / Math.max(feedback.totalFound, 1) * 100}%"></div>
        <div class="h-1.5 bg-gray-300" style="width:${feedback.neutralCount / Math.max(feedback.totalFound, 1) * 100}%"></div>
        <div class="h-1.5 rounded-r-full bg-red-500" style="width:${feedback.negativeCount / Math.max(feedback.totalFound, 1) * 100}%"></div>
      </div>
    </div>`;

  // Themes
  if (feedback.topThemes && feedback.topThemes.length > 0) {
    html += '<div class="bg-white rounded-xl border border-border p-5 mb-4">';
    html += '<h3 class="text-sm font-semibold mb-3">Top Themes</h3>';
    html += '<div class="flex flex-wrap gap-2">';
    for (const t of feedback.topThemes) {
      const tEmoji = t.sentiment === 'positive' ? '👍' : t.sentiment === 'negative' ? '👎' : '➖';
      const tColor = t.sentiment === 'positive' ? 'border-green-200 bg-green-50 text-green-700' :
                     t.sentiment === 'negative' ? 'border-red-200 bg-red-50 text-red-700' :
                     'border-gray-200 bg-gray-50 text-gray-600';
      html += `<span class="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${tColor}">${tEmoji} ${t.theme} · ${t.count}</span>`;
    }
    html += '</div></div>';
  }

  // Individual feedback items
  html += '<div class="space-y-3">';
  const items = feedback.items.slice(0, 20);
  for (const item of items) {
    const sColor = item.sentiment === 'positive' ? 'border-l-green-400' : item.sentiment === 'negative' ? 'border-l-red-400' : 'border-l-gray-300';
    const sBadge = item.sentiment === 'positive' ? 'bg-green-50 text-green-700' : item.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600';
    const scoreLabel = Math.round(item.sentimentScore * 100);
    html += `
      <div class="bg-white rounded-xl border border-border border-l-2 ${sColor} p-4">
        <div class="flex items-start justify-between gap-3 mb-1.5">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500">${item.channel}</span>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sBadge}">${item.sentiment} · ${scoreLabel}%</span>
              ${item.themes.map(t => `<span class="text-[11px] text-muted-foreground">#${t}</span>`).join('')}
            </div>
            <p class="text-sm font-medium mt-1.5 leading-snug">${escapeHtml(item.title.slice(0, 150))}</p>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs font-medium">${item.upvotes}↑</span>
          </div>
        </div>
        ${item.content ? `<p class="text-sm text-muted-foreground mt-1 line-clamp-3">${escapeHtml(item.content.slice(0, 300))}</p>` : ''}
        <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
          <span>${escapeHtml(item.author)}</span>
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" class="text-primary/70 hover:text-primary underline-offset-2">view source ↗</a>` : ''}
          ${item.date ? `<span>${new Date(item.date).toLocaleDateString()}</span>` : ''}
        </div>
      </div>`;
  }
  html += '</div>';

  if (feedback.totalFound > 20) {
    html += `<p class="text-xs text-muted-foreground text-center mt-3">Showing 20 of ${feedback.totalFound} items</p>`;
  }

  feedbackView.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildFallbackHtml(data) {
  const p = data.product || {};
  const a = data.analysis || {};
  const pricing = a.pricing || {};
  const sentiment = a.sentiment || {};

  let h = `<h1>${p.name || 'Unknown Product'}</h1>`;
  h += `<p><strong>Tagline:</strong> ${p.tagline || 'N/A'}</p><hr>`;
  h += '<h2>Overview</h2><ul>';
  h += `<li><strong>Founded:</strong> ${p.founded || 'Unknown'}</li>`;
  h += `<li><strong>Target Users:</strong> ${(a.targetUsers || []).join(', ') || 'Unknown'}</li>`;
  h += `<li><strong>Category:</strong> ${(a.category || []).join(', ') || 'Uncategorized'}</li></ul><hr>`;

  h += '<h2>Pricing</h2>';
  if (pricing.tiers && pricing.tiers.length > 0) {
    h += '<table><tr><th>Tier</th><th>Price</th></tr>';
    for (const t of pricing.tiers) h += `<tr><td>${t.name}</td><td>${t.price === 0 ? 'Free' : '$' + t.price}</td></tr>`;
    h += '</table>';
  } else { h += `<p>Model: ${pricing.model || 'unknown'}</p>`; }
  h += '<hr><h2>Key Features</h2><ol>';
  if (a.features) for (const f of a.features) h += `<li>${f}</li>`;
  h += '</ol><hr>';

  if (sentiment.score !== undefined) {
    h += `<h2>User Sentiment</h2><p><strong>Score:</strong> ${Math.round(sentiment.score * 100)}% positive</p>`;
  }
  return h;
}

// ---- Tab Switching ----
function switchTab(tab) {
  currentTab = tab;
  markdownView.classList.toggle('hidden', tab !== 'markdown');
  feedbackView.classList.toggle('hidden', tab !== 'feedback');
  jsonView.classList.toggle('hidden', tab !== 'json');

  tabMarkdown.classList.toggle('tab-active', tab === 'markdown');
  tabFeedback.classList.toggle('tab-active', tab === 'feedback');
  tabJson.classList.toggle('tab-active', tab === 'json');
}

// ---- UI State ----
function showLoading() {
  loadingSection.classList.remove('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}

function showError(msg, title) {
  loadingSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
  errorMessage.textContent = msg;
  errorTitle.textContent = title || 'Error';
}

function hideAll() {
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}
