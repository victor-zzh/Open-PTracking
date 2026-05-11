import { Hono } from 'hono';
import { validateUrl, normalizeUrl, followRedirects } from '../lib/url';
import { detectPlatform } from '../lib/platform';
import { crawlUrl } from '../services/crawler';
import { extractContent } from '../services/extractor';
import { enrichContent } from '../services/enricher';
import { synthesize } from '../services/synthesizer';
import { collectFeedback } from '../services/collector';
import { formatJson, formatMarkdown, formatFeedbackMarkdown } from '../services/formatter';
import { checkCache, storeResult } from '../lib/cache';
import { saveFeedbackItems, getCachedFeedback } from '../lib/supabase';

export const analyzeRouter = new Hono();

// POST /api/analyze
analyzeRouter.post('/analyze', async (c) => {
  const startTime = Date.now();

  // Parse input
  let body: { url?: string; lang?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_request', message: 'Request body must be JSON' }, 400);
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return c.json({ error: 'invalid_request', message: 'URL is required' }, 400);
  }

  // Validate URL
  const validation = validateUrl(rawUrl);
  if (!validation.valid) {
    return c.json({ error: 'invalid_url', message: validation.error }, 400);
  }

  const url = validation.url!.toString();

  // Check cache
  const cacheResult = await checkCache(url);
  if (cacheResult.hit && cacheResult.snapshot) {
    const processingTime = Date.now() - startTime;
    return c.json({
      ...cacheResult.snapshot,
      cached: true,
      cachedAt: cacheResult.cachedAt,
      meta: {
        ...cacheResult.snapshot.meta,
        processingTime,
      },
    });
  }

  // Follow redirects to get final URL
  let finalUrl = url;
  try {
    const redirectResult = await followRedirects(url);
    finalUrl = redirectResult.finalUrl;
  } catch {
    // Continue with original URL on redirect failure
  }

  // Detect platform
  const { platform, label: platformLabel } = detectPlatform(finalUrl);

  // Crawl the URL
  const fetchResult = await crawlUrl(finalUrl);

  if (fetchResult.error) {
    const processingTime = Date.now() - startTime;

    // Return partial result with error info
    if (fetchResult.error === 'blocked') {
      return c.json({
        error: 'access_denied',
        message: 'This page requires login or blocks automated access. Please try a public page or blog link.',
        source: { url: finalUrl, platform: platformLabel, originalUrl: url },
        meta: { processingTime },
      }, 422);
    }

    if (fetchResult.error === 'timeout') {
      return c.json({
        error: 'timeout',
        message: 'The page took too long to respond. Please verify the URL or try again.',
        source: { url: finalUrl, platform: platformLabel, originalUrl: url },
        meta: { processingTime },
      }, 504);
    }

    return c.json({
      error: 'fetch_failed',
      message: 'Unable to access this URL. Please verify the link is correct.',
      source: { url: finalUrl, platform: platformLabel, originalUrl: url },
      meta: { processingTime },
    }, 502);
  }

  // Check for empty or very small pages
  if (!fetchResult.html || fetchResult.html.length < 100) {
    const processingTime = Date.now() - startTime;
    return c.json({
      error: 'insufficient_data',
      message: 'This page contains very little content. The product may be pre-release or in stealth mode.',
      source: { url: finalUrl, platform: platformLabel, originalUrl: url },
      meta: { processingTime },
    }, 422);
  }

  // Extract content
  const extracted = extractContent(fetchResult.html, finalUrl);

  // Enrich: concurrent structured extraction (pricing, features, competitors, etc.)
  const enriched = enrichContent(fetchResult.html, extracted);

  // Determine product name for feedback search
  const productName =
    enriched.productNameCandidates[0] ||
    extracted.h1Text ||
    extracted.title ||
    'Unknown Product';

  // Phase: Run LLM synthesis AND feedback collection concurrently
  const [synResult, feedbackReport] = await Promise.all([
    synthesize(
      enriched,
      extracted.language,
      extracted.title,
      extracted.metaDescription,
      extracted.h1Text,
      finalUrl
    ),
    (async () => {
      // Check feedback cache first
      const cached = await getCachedFeedback(productName);
      if (cached && cached.items.length > 0) return { ...cached, cached: true };
      const report = await collectFeedback(productName);
      return { ...report, cached: false };
    })(),
  ]);

  const processingTime = Date.now() - startTime;

  // Format output
  const snapshot = formatJson(
    synResult.product,
    synResult.analysis,
    finalUrl,
    platformLabel,
    extracted.language,
    processingTime,
    synResult.meta.confidence,
    url
  );

  const markdown = formatMarkdown(snapshot);

  // Generate feedback markdown section
  const feedbackMarkdown = formatFeedbackMarkdown(feedbackReport, productName);

  // Store results
  const storePromise = storeResult(snapshot, url, platformLabel, processingTime);
  const feedbackSavePromise = feedbackReport.cached
    ? Promise.resolve(0)
    : saveFeedbackItems(feedbackReport.items, productName, null);

  await Promise.all([storePromise, feedbackSavePromise]);

  return c.json({
    ...snapshot,
    markdown: markdown + '\n\n' + feedbackMarkdown,
    feedback: {
      ...feedbackReport,
      markdown: feedbackMarkdown,
    },
    cached: false,
    warning: synResult.warning,
  });
});

// GET /api/snapshot/:id
analyzeRouter.get('/snapshot/:id', async (c) => {
  // Currently only works with in-memory cache IDs
  // For Supabase-based retrieval, use the Supabase client directly
  const id = c.req.param('id');
  return c.json({ error: 'not_implemented', message: 'Snapshot retrieval by ID requires Supabase' }, 501);
});
