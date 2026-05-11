/**
 * Concurrent structured extraction from HTML.
 * Runs multiple extractors in parallel, then assembles results.
 * Goal: pre-structure data before sending to LLM, cutting token usage and latency.
 */
import type { ExtractedContent } from '../lib/types';

export interface EnrichedData {
  // Product signals
  productNameCandidates: string[];
  taglineCandidates: string[];
  metaDescription: string;

  // Content structure
  headings: { level: number; text: string }[];
  sectionTitles: string[];

  // Pricing signals
  pricingCandidates: PricingSignal[];

  // Feature candidates
  featureCandidates: string[];

  // Category hints
  categoryHints: string[];

  // Target user signals
  targetUserHints: string[];

  // Competitor mentions
  competitorMentions: string[];

  // Sentiment signals
  positivePhrases: string[];
  negativePhrases: string[];

  // Cleaned body text (shorter, for LLM)
  bodySummary: string;
}

interface PricingSignal {
  text: string;
  amount?: number;
  period?: string;
  tier?: string;
}

// ---- Individual Extractors (run concurrently) ----

function extractProductNames(html: string, extracted: ExtractedContent): string[] {
  const candidates: string[] = [];
  // From meta tags
  if (extracted.ogTitle) candidates.push(extracted.ogTitle);
  if (extracted.title && !candidates.includes(extracted.title)) candidates.push(extracted.title);
  if (extracted.h1Text && !candidates.includes(extracted.h1Text)) candidates.push(extracted.h1Text);

  // From patterns like "ProductName — tagline" or "ProductName | tagline"
  const titleMatch = extracted.title.match(/^(.+?)\s*[—|\-–:]\s*(.+)/);
  if (titleMatch && titleMatch[1]) candidates.push(titleMatch[1].trim());

  return [...new Set(candidates.filter(Boolean))];
}

function extractHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const regex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2]?.replace(/<[^>]*>/g, '').trim();
    if (text && text.length < 200) {
      headings.push({ level: parseInt(match[1]!), text });
    }
  }
  return headings;
}

function extractPricingSignals(html: string, text: string): PricingSignal[] {
  const signals: PricingSignal[] = [];

  // $XX/month, $XX/mo, $XX/year patterns
  const priceRegex = /\$(\d+(?:\.\d{2})?)\s*(?:\/|\s*per\s*)(month|mo|year|yr|one-time|seat|user)/gi;
  let match;
  while ((match = priceRegex.exec(text)) !== null) {
    signals.push({
      text: match[0],
      amount: parseFloat(match[1]!),
      period: match[2]?.toLowerCase(),
    });
  }

  // ¥XX patterns
  const cnyRegex = /[¥￥](\d+(?:\.\d{2})?)/g;
  while ((match = cnyRegex.exec(text)) !== null) {
    signals.push({ text: match[0], amount: parseFloat(match[1]!) });
  }

  // Free / Freemium / Enterprise keywords
  const modelRegex = /(free|freemium|open.source|enterprise.plan|contact.sales|request.demo|get.started.free|start.free)/gi;
  while ((match = modelRegex.exec(text)) !== null) {
    signals.push({ text: match[0], tier: match[1]?.toLowerCase() });
  }

  // Pricing section detection
  const pricingSectionRegex = /(?:pricing|price|plan|plans|subscription|billing)/gi;
  if (pricingSectionRegex.test(html)) {
    signals.push({ text: 'pricing_section_detected' });
  }

  return signals;
}

function extractFeatureCandidates(text: string): string[] {
  const features: string[] = [];

  // Bullet points / list items that look like features
  const bulletRegex = /(?:^|\n)\s*[-•*✓✅]\s*(.+?)(?:\n|$)/gm;
  let match;
  while ((match = bulletRegex.exec(text)) !== null) {
    const item = match[1]?.trim();
    if (item && item.length > 5 && item.length < 150) {
      features.push(item);
    }
  }

  // Numbered lists
  const numRegex = /(?:^|\n)\s*\d+[.)]\s*(.+?)(?:\n|$)/gm;
  while ((match = numRegex.exec(text)) !== null) {
    const item = match[1]?.trim();
    if (item && item.length > 5 && item.length < 150 && !features.includes(item)) {
      features.push(item);
    }
  }

  return features.slice(0, 20);
}

function extractCompetitors(text: string): string[] {
  const competitors: string[] = [];

  // Known competitor signals
  const comparePatterns = [
    /(?:vs\.?|versus|alternative to|competitor|rival|better than)\s+([A-Z][a-zA-Z0-9\s]+?)(?:\.|,|and|\n|$)/gi,
    /(?:compared to|unlike|instead of)\s+([A-Z][a-zA-Z0-9\s]+?)(?:\.|,|and|\n|$)/gi,
  ];

  for (const pattern of comparePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 1 && name.length < 50) {
        competitors.push(name);
      }
    }
  }

  return [...new Set(competitors)];
}

function extractSentimentSignals(text: string): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];

  const posWords = /\b(fast|intuitive|easy|powerful|amazing|great|excellent|best|love|impressive|game.changer|innovative)\b/gi;
  const negWords = /\b(slow|buggy|expensive|pricey|limited|broken|frustrating|confusing|lack|missing|hard.to.use|clunky|unstable)\b/gi;

  let match;
  while ((match = posWords.exec(text)) !== null) {
    // Get surrounding context
    const idx = match.index;
    const ctx = text.slice(Math.max(0, idx - 40), idx + 60).trim();
    positive.push(ctx);
  }
  while ((match = negWords.exec(text)) !== null) {
    const idx = match.index;
    const ctx = text.slice(Math.max(0, idx - 40), idx + 60).trim();
    negative.push(ctx);
  }

  return {
    positive: positive.slice(0, 8),
    negative: negative.slice(0, 8),
  };
}

function extractCategoryHints(text: string): string[] {
  const categories = new Set<string>();

  const categoryMap: Record<string, RegExp> = {
    'AI IDE': /ai\s*(?:native|first|powered)?\s*(?:code|ide|editor|development)/i,
    'Code Editor': /code\s*editor|text\s*editor|ide\b/i,
    'AI Chat': /chat\s*bot|ai\s*chat|conversational\s*ai|assistant/i,
    'Image Generation': /image\s*generat|text\s*to\s*image|ai\s*art|stable\s*diffusion/i,
    'Video Generation': /video\s*generat|text\s*to\s*video/i,
    'LLM/Foundation Model': /\bllm\b|large\s*language\s*model|foundation\s*model|gpt\b/i,
    'Developer Tools': /developer\s*tool|api\b|sdk\b|platform/i,
    'Productivity': /productivity|workflow|automation|nocode|no.code/i,
    'Design': /design|figma|ui\b|ux\b|prototype/i,
    'Data/Analytics': /analytics|dashboard|insight|data\s*platform|visualization/i,
    'DevOps/Infra': /devops|infrastructure|cloud|deployment|monitoring|serverless/i,
    'Security': /security|auth|encryption|compliance|zero.trust/i,
  };

  for (const [category, pattern] of Object.entries(categoryMap)) {
    if (pattern.test(text)) {
      categories.add(category);
    }
  }

  return [...categories];
}

function extractTargetUserHints(text: string): string[] {
  const hints = new Set<string>();

  const userMap: Record<string, RegExp> = {
    'Developers': /developer|engineer|coder|programmer|software/i,
    'Indie Hackers': /indie\s*hacker|solo\s*founder|bootstrapper/i,
    'Small Teams': /small\s*team|startup|sme\b/i,
    'Enterprise': /enterprise|large\s*company|organization|corporate/i,
    'Designers': /designer|creative|artist/i,
    'Product Managers': /product\s*manager|pm\b/i,
    'Marketers': /marketer|marketing|growth|seo\b/i,
    'Consumers': /consumer|personal\s*use|individual|everyone/i,
  };

  for (const [user, pattern] of Object.entries(userMap)) {
    if (pattern.test(text)) {
      hints.add(user);
    }
  }

  return [...hints];
}

function buildBodySummary(text: string): string {
  // Take first 2000 chars + last 1000 chars as summary
  const first = text.slice(0, 2000).trim();
  const last = text.slice(-1000).trim();
  if (text.length <= 3000) return text;
  return first + '\n\n...[content truncated]...\n\n' + last;
}

// ---- Main Orchestrator ----

export function enrichContent(html: string, extracted: ExtractedContent): EnrichedData {
  const text = extracted.textContent;

  // Run all extractors concurrently (sync here, but logically parallel)
  // In practice these are fast regex ops that run in microseconds
  const productNameCandidates = extractProductNames(html, extracted);
  const headings = extractHeadings(html);
  const pricingCandidates = extractPricingSignals(html, text);
  const featureCandidates = extractFeatureCandidates(text);
  const competitorMentions = extractCompetitors(text);
  const { positive: positivePhrases, negative: negativePhrases } = extractSentimentSignals(text);
  const categoryHints = extractCategoryHints(text);
  const targetUserHints = extractTargetUserHints(text);
  const bodySummary = buildBodySummary(text);

  return {
    productNameCandidates,
    taglineCandidates: [
      extracted.ogDescription,
      extracted.metaDescription,
      extracted.title,
    ].filter(Boolean) as string[],
    metaDescription: extracted.metaDescription || '',
    headings,
    sectionTitles: headings.filter(h => h.level <= 2).map(h => h.text),
    pricingCandidates,
    featureCandidates,
    categoryHints,
    targetUserHints,
    competitorMentions,
    positivePhrases,
    negativePhrases,
    bodySummary,
  };
}
