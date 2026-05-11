/**
 * Multi-channel user feedback collector.
 * Searches Reddit, HackerNews, ProductHunt, and web for real user reviews/comments.
 * Runs all channels concurrently.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ---- Types ----

export interface FeedbackItem {
  id: string;
  channel: 'reddit' | 'hackernews' | 'producthunt' | 'twitter' | 'web';
  title: string;
  content: string;
  author: string;
  url: string;
  date: string;
  upvotes: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // 0-1
  themes: string[];
}

export interface FeedbackReport {
  items: FeedbackItem[];
  totalFound: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topThemes: { theme: string; count: number; sentiment: string }[];
  channels: { channel: string; count: number }[];
  aggregatedSentiment: number; // 0-1
}

// ---- Reddit Search (free JSON API) ----

async function searchReddit(
  query: string,
  limit = 15
): Promise<Array<{ title: string; selftext: string; author: string; permalink: string; created_utc: number; score: number; subreddit: string }>> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=comments&limit=${limit}&t=year`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Open-PTracking/1.0 (competitive intelligence tool)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json() as {
      data: { children: Array<{ data: { title: string; selftext: string; author: string; permalink: string; created_utc: number; score: number; subreddit: string } }> };
    };

    return (data.data?.children || []).map(c => c.data).filter(d => d.score > 0);
  } catch {
    return [];
  }
}

// ---- HackerNews Search (Algolia API) ----

async function searchHackerNews(
  query: string,
  limit = 15
): Promise<Array<{ title: string; comment_text: string; author: string; objectID: string; created_at: string; points: number }>> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json() as { hits: Array<{ title: string; comment_text: string; author: string; objectID: string; created_at: string; points: number }> };

    return (data.hits || []).filter(h => h.points > 0 || h.comment_text);
  } catch {
    return [];
  }
}

// ---- ProductHunt Search ----

async function searchProductHunt(
  query: string,
  limit = 10
): Promise<Array<{ name: string; tagline: string; description: string; url: string; votesCount: number; reviewsCount: number }>> {
  try {
    // Use ProductHunt's public GraphQL-like search
    const searchUrl = `https://www.producthunt.com/search?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();

    // Extract product info from script tags (ProductHunt embeds data in __NEXT_DATA__)
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
    if (!match || !match[1]) return [];

    const json = JSON.parse(match[1]);
    const results: Array<{ name: string; tagline: string; description: string; url: string; votesCount: number; reviewsCount: number }> = [];

    // Walk the Next.js data to find product nodes
    function walk(obj: unknown) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (const item of obj) walk(item);
        return;
      }
      const o = obj as Record<string, unknown>;
      if (o.name && o.tagline && (o.votesCount !== undefined || o.reviewsCount !== undefined)) {
        results.push({
          name: String(o.name),
          tagline: String(o.tagline || ''),
          description: String(o.description || ''),
          url: o.url ? `https://www.producthunt.com${o.url}` : '',
          votesCount: Number(o.votesCount) || 0,
          reviewsCount: Number(o.reviewsCount) || 0,
        });
      }
      for (const v of Object.values(o)) walk(v);
    }

    walk(json);
    return results.slice(0, limit);
  } catch {
    return [];
  }
}

// ---- Web Search for mentions (via search engine) ----

async function searchWeb(
  query: string,
  limit = 10
): Promise<Array<{ title: string; snippet: string; url: string }>> {
  // For now, search Reddit broadly since it's the richest source of user feedback
  // In production, this could use SerpAPI, Brave Search API, or similar
  return [];
}

// ---- Classify Feedback Items with LLM ----

async function classifyFeedback(
  items: Array<{ title: string; content: string; channel: string }>
): Promise<Array<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number; themes: string[] }>> {
  if (items.length === 0) return [];

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: simple keyword-based classification
    return items.map(item => keywordClassify(item.title + ' ' + item.content));
  }

  // Use DeepSeek (faster) or Anthropic
  const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;

  try {
    const itemsText = items.map((item, i) =>
      `[${i}] Channel: ${item.channel}\nTitle: ${item.title}\nContent: ${item.content.slice(0, 300)}`
    ).join('\n\n---\n\n');

    const prompt = `Classify each user feedback item below. For each item, return: sentiment ("positive"|"negative"|"neutral"), score (0-1, 1=very positive), and key themes (1-3 words each).

Return ONLY a JSON array, no other text:
[{"sentiment": "positive", "score": 0.8, "themes": ["fast", "reliable"]}, ...]

Items:
${itemsText}`;

    let text: string;

    if (isDeepSeek) {
      const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY!,
      });
      const res = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: 'You are a feedback classifier. Return ONLY valid JSON arrays. No markdown, no explanations.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0,
        stream: false,
      } as Record<string, unknown> as OpenAI.ChatCompletionCreateParamsNonStreaming);
      text = res.choices[0]?.message?.content || '';
    } else {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const res = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });
      text = res.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('\n');
    }

    // Parse JSON array
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/```\w*\n?/g, '').replace(/```/g, '');
    const arr = JSON.parse(cleaned);
    return arr.map((item: { sentiment: string; score: number; themes: string[] }) => ({
      sentiment: item.sentiment || 'neutral',
      score: Math.max(0, Math.min(1, item.score || 0.5)),
      themes: item.themes || [],
    }));
  } catch {
    return items.map(item => keywordClassify(item.title + ' ' + item.content));
  }
}

function keywordClassify(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; themes: string[] } {
  const lower = text.toLowerCase();

  const posWords = ['love', 'great', 'excellent', 'amazing', 'best', 'fast', 'intuitive', 'impressive', 'perfect', '推荐', '好用', '赞', '棒', '不错'];
  const negWords = ['hate', 'terrible', 'slow', 'buggy', 'expensive', 'pricey', 'broken', 'frustrating', 'waste', '差', '贵', '烂', '难用', '垃圾'];

  let posCount = 0;
  let negCount = 0;
  const themes: string[] = [];

  for (const w of posWords) if (lower.includes(w)) posCount++;
  for (const w of negWords) if (lower.includes(w)) negCount++;

  const total = posCount + negCount || 1;
  const score = posCount / total;

  if (posCount > negCount * 2) return { sentiment: 'positive', score, themes };
  if (negCount > posCount * 2) return { sentiment: 'negative', score, themes };
  return { sentiment: 'neutral', score: 0.5, themes };
}

// ---- Main Collector ----

export async function collectFeedback(
  productName: string,
  options: { channels?: string[]; maxPerChannel?: number } = {}
): Promise<FeedbackReport> {
  const channels = options.channels || ['reddit', 'hackernews', 'producthunt'];
  const maxPerChannel = options.maxPerChannel || 15;

  console.log(`🔍 Collecting feedback for "${productName}" across ${channels.join(', ')}...`);

  // ---- Phase 1: Concurrent search across all channels ----
  const searchTasks: Promise<{ channel: string; results: unknown[] }>[] = [];

  for (const channel of channels) {
    switch (channel) {
      case 'reddit':
        searchTasks.push(
          searchReddit(productName, maxPerChannel).then(results => ({
            channel: 'reddit',
            results,
          }))
        );
        break;
      case 'hackernews':
        searchTasks.push(
          searchHackerNews(productName, maxPerChannel).then(results => ({
            channel: 'hackernews',
            results,
          }))
        );
        break;
      case 'producthunt':
        searchTasks.push(
          searchProductHunt(productName, maxPerChannel).then(results => ({
            channel: 'producthunt',
            results,
          }))
        );
        break;
    }
  }

  const searchResults = await Promise.allSettled(searchTasks);

  // ---- Phase 2: Normalize into FeedbackItems ----
  const rawItems: Array<{ title: string; content: string; author: string; url: string; date: string; upvotes: number; channel: string }> = [];

  for (const result of searchResults) {
    if (result.status !== 'fulfilled') continue;
    const { channel, results } = result.value;

    for (const item of results) {
      if (channel === 'reddit') {
        const r = item as { title: string; selftext: string; author: string; permalink: string; created_utc: number; score: number; subreddit: string };
        rawItems.push({
          title: r.title,
          content: r.selftext || '',
          author: r.author,
          url: `https://www.reddit.com${r.permalink}`,
          date: new Date(r.created_utc * 1000).toISOString(),
          upvotes: r.score,
          channel: 'reddit',
        });
      } else if (channel === 'hackernews') {
        const h = item as { title: string; comment_text: string; author: string; objectID: string; created_at: string; points: number };
        rawItems.push({
          title: h.title || 'HN Comment',
          content: h.comment_text || '',
          author: h.author,
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          date: h.created_at,
          upvotes: h.points || 0,
          channel: 'hackernews',
        });
      } else if (channel === 'producthunt') {
        const p = item as { name: string; tagline: string; description: string; url: string; votesCount: number; reviewsCount: number };
        rawItems.push({
          title: p.name,
          content: `${p.tagline}\n${p.description}`,
          author: 'producthunt',
          url: p.url,
          date: new Date().toISOString(),
          upvotes: p.votesCount || 0,
          channel: 'producthunt',
        });
      }
    }
  }

  if (rawItems.length === 0) {
    return {
      items: [],
      totalFound: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      topThemes: [],
      channels: [],
      aggregatedSentiment: 0.5,
    };
  }

  // ---- Phase 3: LLM Classification (batch) ----
  console.log(`🏷️  Classifying ${rawItems.length} feedback items...`);
  const classifications = await classifyFeedback(
    rawItems.map(item => ({
      title: item.title,
      content: item.content,
      channel: item.channel,
    }))
  );

  // ---- Phase 4: Assemble final report ----
  const items: FeedbackItem[] = rawItems.map((raw, i) => ({
    id: `${raw.channel}-${i}`,
    channel: raw.channel as FeedbackItem['channel'],
    title: raw.title,
    content: raw.content,
    author: raw.author,
    url: raw.url,
    date: raw.date,
    upvotes: raw.upvotes,
    sentiment: classifications[i]?.sentiment || 'neutral',
    sentimentScore: classifications[i]?.score || 0.5,
    themes: classifications[i]?.themes || [],
  }));

  // Sort by upvotes desc
  items.sort((a, b) => b.upvotes - a.upvotes);

  // Aggregate
  const positiveCount = items.filter(i => i.sentiment === 'positive').length;
  const negativeCount = items.filter(i => i.sentiment === 'negative').length;
  const neutralCount = items.filter(i => i.sentiment === 'neutral').length;
  const aggregatedSentiment = items.length > 0
    ? items.reduce((sum, i) => sum + i.sentimentScore, 0) / items.length
    : 0.5;

  // Top themes
  const themeMap = new Map<string, { count: number; sentiments: string[] }>();
  for (const item of items) {
    for (const theme of item.themes) {
      if (!themeMap.has(theme)) {
        themeMap.set(theme, { count: 0, sentiments: [] });
      }
      const t = themeMap.get(theme)!;
      t.count++;
      t.sentiments.push(item.sentiment);
    }
  }
  const topThemes = [...themeMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([theme, data]) => ({
      theme,
      count: data.count,
      sentiment: data.sentiments.filter(s => s === 'positive').length > data.sentiments.length / 2
        ? 'positive' : data.sentiments.filter(s => s === 'negative').length > data.sentiments.length / 2
          ? 'negative' : 'neutral',
    }));

  // Channel breakdown
  const channelMap = new Map<string, number>();
  for (const item of items) {
    channelMap.set(item.channel, (channelMap.get(item.channel) || 0) + 1);
  }
  const channelBreakdown = [...channelMap.entries()].map(([channel, count]) => ({ channel, count }));

  console.log(`✅ Feedback collected: ${items.length} items (${positiveCount}+ / ${negativeCount}- / ${neutralCount}~)`);

  return {
    items,
    totalFound: items.length,
    positiveCount,
    negativeCount,
    neutralCount,
    topThemes,
    channels: channelBreakdown,
    aggregatedSentiment,
  };
}
