import type { Snapshot, SnapshotProduct, SnapshotAnalysis } from '../lib/types';
import type { FeedbackReport } from './collector';

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

export function formatFeedbackMarkdown(report: FeedbackReport, productName: string): string {
  if (report.totalFound === 0) {
    return [
      '',
      '---',
      '',
      '## User Feedback',
      '',
      '_No user feedback found across channels._',
      '',
    ].join('\n');
  }

  const lines: string[] = [
    '',
    '---',
    '',
    '## User Feedback',
    '',
    `**${report.totalFound}** real user mentions found across **${report.channels.length}** channels.`,
    '',
  ];

  // Sentiment summary
  const aggPct = Math.round(report.aggregatedSentiment * 100);
  const sentimentEmoji = aggPct >= 65 ? '🟢' : aggPct >= 40 ? '🟡' : '🔴';
  lines.push(`**Overall Sentiment:** ${sentimentEmoji} ${aggPct}% positive (${report.positiveCount}+ / ${report.negativeCount}- / ${report.neutralCount}~)`);
  lines.push('');

  // Channel breakdown
  lines.push('### Channels');
  lines.push('| Channel | Mentions |');
  lines.push('|---------|----------|');
  for (const ch of report.channels) {
    lines.push(`| ${ch.channel} | ${ch.count} |`);
  }
  lines.push('');

  // Top themes
  if (report.topThemes.length > 0) {
    lines.push('### Top Themes');
    lines.push('| Theme | Mentions | Sentiment |');
    lines.push('|-------|----------|-----------|');
    for (const t of report.topThemes) {
      const sEmoji = t.sentiment === 'positive' ? '👍' : t.sentiment === 'negative' ? '👎' : '➖';
      lines.push(`| ${t.theme} | ${t.count} | ${sEmoji} ${t.sentiment} |`);
    }
    lines.push('');
  }

  // Individual feedback items (sorted by upvotes)
  lines.push('### Top Feedback');
  lines.push('');
  const topItems = report.items.slice(0, 15);
  for (const item of topItems) {
    const sLabel = item.sentiment === 'positive' ? '🟢' : item.sentiment === 'negative' ? '🔴' : '⚪';
    const channelLabel = item.channel.toUpperCase();
    const scoreLabel = Math.round(item.sentimentScore * 100);
    lines.push(`- ${sLabel} **[${channelLabel}]** ${item.title.slice(0, 120)} — _${item.author}_ (${item.upvotes}↑ · ${scoreLabel}%)`);
    if (item.content) {
      const snippet = item.content.slice(0, 300).replace(/\n/g, ' ');
      lines.push(`  > ${snippet}${item.content.length > 300 ? '...' : ''}`);
    }
    if (item.themes.length > 0) {
      lines.push(`  Themes: ${item.themes.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
