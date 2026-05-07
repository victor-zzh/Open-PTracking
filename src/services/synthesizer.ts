import { chat, detectLLMConfig } from './llm';
import { buildExtractionPrompt } from '../prompts/extraction';
import type { SnapshotAnalysis, SnapshotProduct, Sentiment, PricingTier, CompetitorRef } from '../lib/types';

interface LLMOutput {
  product: {
    name: string | null;
    tagline: string | null;
    founded: string | null;
    teamSize: string | null;
    url: string | null;
  };
  analysis: {
    targetUsers: string[];
    category: string[];
    pricing: {
      model: string;
      tiers: Array<{ name: string; price: number; period?: string }>;
    };
    features: string[];
    competitors: Array<{ name: string; confidence: string }>;
    sentiment: {
      positive: string[];
      negative: string[];
      score: number;
    };
  };
  meta: {
    confidence: number;
  };
}

function parseJsonFromResponse(text: string): LLMOutput | null {
  // Remove any markdown fences
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as LLMOutput;
  } catch {
    // Try to find JSON object boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as LLMOutput;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeOutput(raw: LLMOutput): {
  product: SnapshotProduct;
  analysis: SnapshotAnalysis;
  meta: { confidence: number };
  warning?: string;
} {
  const warning: string | undefined = undefined;

  const product: SnapshotProduct = {
    name: raw.product?.name || 'Unknown Product',
    tagline: raw.product?.tagline || '',
    founded: raw.product?.founded || null,
    teamSize: raw.product?.teamSize || null,
    url: raw.product?.url || '',
  };

  const sentiment: Sentiment = {
    positive: raw.analysis?.sentiment?.positive || [],
    negative: raw.analysis?.sentiment?.negative || [],
    score: typeof raw.analysis?.sentiment?.score === 'number'
      ? Math.max(0, Math.min(1, raw.analysis.sentiment.score))
      : 0.5,
  };

  const pricing = {
    model: raw.analysis?.pricing?.model || 'unknown',
    tiers: (raw.analysis?.pricing?.tiers || []).map(t => ({
      name: t.name || 'Unknown',
      price: typeof t.price === 'number' ? t.price : 0,
      period: t.period as 'month' | 'year' | 'one-time' | undefined,
    })),
  };

  const competitors: CompetitorRef[] = (raw.analysis?.competitors || []).map(c => ({
    name: c.name || 'Unknown',
    confidence: (['high', 'medium', 'low'].includes(c.confidence)
      ? c.confidence
      : 'low') as 'high' | 'medium' | 'low',
  }));

  return {
    product,
    analysis: {
      targetUsers: raw.analysis?.targetUsers || [],
      category: raw.analysis?.category || [],
      pricing,
      features: raw.analysis?.features || [],
      competitors,
      sentiment,
    },
    meta: {
      confidence: typeof raw.meta?.confidence === 'number'
        ? Math.max(0, Math.min(1, raw.meta.confidence))
        : 0.5,
    },
  };
}

// Fallback: basic extraction without LLM
function fallbackExtraction(
  title: string,
  metaDescription: string,
  h1Text: string,
  url: string
): ReturnType<typeof normalizeOutput> {
  const displayName = h1Text || title || 'Unknown Product';
  return {
    product: {
      name: displayName,
      tagline: metaDescription || '',
      founded: null,
      teamSize: null,
      url,
    },
    analysis: {
      targetUsers: [],
      category: [],
      pricing: { model: 'unknown', tiers: [] },
      features: [],
      competitors: [],
      sentiment: { positive: [], negative: [], score: 0.5 },
    },
    meta: { confidence: 0.1 },
  };
}

export async function synthesize(
  content: string,
  language: string,
  title: string,
  metaDescription: string,
  h1Text: string,
  url: string
): Promise<{
  product: SnapshotProduct;
  analysis: SnapshotAnalysis;
  meta: { confidence: number };
  warning?: string;
}> {
  const config = detectLLMConfig();

  if (!config) {
    console.warn('No LLM provider configured — using fallback extraction');
    return {
      ...fallbackExtraction(title, metaDescription, h1Text, url),
      warning: 'llm_unavailable',
    };
  }

  const { system, messages } = buildExtractionPrompt(content, language);

  const maxRetries = 2;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await chat(
        messages.map(m => ({ role: m.role, content: m.content })),
        system
      );

      const parsed = parseJsonFromResponse(text);

      if (parsed) {
        return normalizeOutput(parsed);
      }

      // Parse failed — retry with error feedback
      lastError = 'parse_failed';
      messages.push(
        { role: 'assistant', content: text },
        {
          role: 'user',
          content:
            'Your response was not valid JSON. Return ONLY the JSON object with no surrounding text, markdown fences, or explanations.',
        }
      );
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return {
    ...fallbackExtraction(title, metaDescription, h1Text, url),
    warning: lastError || 'llm_error',
  };
}
