import type { Snapshot, SnapshotProduct, SnapshotAnalysis } from '../lib/types';

export function formatJson(
  product: SnapshotProduct,
  analysis: SnapshotAnalysis,
  sourceUrl: string,
  platform: string,
  language: string,
  processingTimeMs: number,
  confidence: number,
  originalUrl?: string
): Snapshot {
  return {
    version: '1.0',
    analyzedAt: new Date().toISOString(),
    source: {
      url: sourceUrl,
      platform,
      originalUrl: originalUrl || sourceUrl,
    },
    product,
    analysis,
    meta: {
      sourcesAnalyzed: 1,
      processingTime: processingTimeMs,
      language,
      confidence,
    },
  };
}

export function formatMarkdown(snapshot: Snapshot): string {
  const { product, analysis, source, meta } = snapshot;

  const lines: string[] = [
    `# ${product.name}`,
    '',
    `**Tagline:** ${product.tagline || 'N/A'}`,
    '',
    '---',
    '',
    '## Overview',
    `- **Founded:** ${product.founded || 'Unknown'}`,
    `- **Target Users:** ${analysis.targetUsers.length > 0 ? analysis.targetUsers.join(', ') : 'Unknown'}`,
    `- **Category:** ${analysis.category.length > 0 ? analysis.category.join(', ') : 'Uncategorized'}`,
    `- **Website:** ${product.url || source.url}`,
    '',
    '---',
    '',
  ];

  // Pricing
  lines.push('## Pricing');
  if (analysis.pricing.tiers.length > 0) {
    lines.push('| Tier | Price |');
    lines.push('|------|-------|');
    for (const tier of analysis.pricing.tiers) {
      const period = tier.period ? `/${tier.period}` : '';
      const priceStr = tier.price === 0 ? 'Free' : `$${tier.price}${period}`;
      lines.push(`| ${tier.name} | ${priceStr} |`);
    }
    lines.push(`_Model: ${analysis.pricing.model}_`);
  } else {
    lines.push(`_Pricing model: ${analysis.pricing.model}_`);
  }
  lines.push('', '---', '');

  // Key Features
  lines.push('## Key Features');
  if (analysis.features.length > 0) {
    for (let i = 0; i < analysis.features.length; i++) {
      lines.push(`${i + 1}. ${analysis.features[i]}`);
    }
  } else {
    lines.push('_No features extracted_');
  }
  lines.push('', '---', '');

  // Competitive Position
  lines.push('## Competitive Position');
  if (analysis.competitors.length > 0) {
    lines.push('**Direct Competitors:** ' + analysis.competitors.map(c => c.name).join(', '));
  } else {
    lines.push('_No competitors identified_');
  }
  lines.push('', '---', '');

  // User Sentiment
  lines.push('## User Sentiment');
  if (analysis.sentiment.positive.length > 0) {
    lines.push('**Positive:** ' + analysis.sentiment.positive.map(s => `"${s}"`).join(', '));
  }
  if (analysis.sentiment.negative.length > 0) {
    lines.push('**Negative:** ' + analysis.sentiment.negative.map(s => `"${s}"`).join(', '));
  }
  if (analysis.sentiment.positive.length === 0 && analysis.sentiment.negative.length === 0) {
    lines.push('_No sentiment data available_');
  }
  lines.push(`**Score:** ${Math.round(analysis.sentiment.score * 100)}% positive`);
  lines.push('', '---', '');

  // Meta
  lines.push(
    `*Analyzed from ${source.platform} · ${meta.sourcesAnalyzed} source(s) · ${(meta.processingTime / 1000).toFixed(1)}s · Confidence: ${Math.round(meta.confidence * 100)}%*`
  );

  return lines.join('\n');
}
