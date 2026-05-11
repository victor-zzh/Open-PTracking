import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Snapshot, SnapshotRecord } from './types';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured — using in-memory storage');
    return null;
  }

  client = createClient(url, key);
  return client;
}

function toRecord(
  snapshot: Snapshot,
  sourceUrl: string,
  normalizedUrl: string,
  platform: string,
  processingTimeMs: number
): Omit<SnapshotRecord, 'id' | 'created_at'> {
  return {
    source_url: sourceUrl,
    normalized_url: normalizedUrl,
    platform,
    product_name: snapshot.product.name,
    tagline: snapshot.product.tagline,
    founded: snapshot.product.founded,
    team_size: snapshot.product.teamSize,
    target_users: snapshot.analysis.targetUsers,
    category: snapshot.analysis.category,
    pricing: snapshot.analysis.pricing as unknown as Record<string, unknown>,
    features: snapshot.analysis.features,
    competitors: snapshot.analysis.competitors as unknown as Record<string, unknown>[],
    sentiment: snapshot.analysis.sentiment as unknown as Record<string, unknown>,
    summary: {
      what: snapshot.product.tagline,
      who: snapshot.analysis.targetUsers.join(', '),
      why: snapshot.analysis.category.join(', '),
      momentum: 'stable' as const,
    },
    raw_markdown: '',
    raw_json: snapshot as unknown as Record<string, unknown>,
    language: snapshot.meta.language,
    confidence: snapshot.meta.confidence,
    processing_time_ms: processingTimeMs,
    fetch_error: null,
    llm_warning: null,
  };
}

export async function saveSnapshot(
  snapshot: Snapshot,
  sourceUrl: string,
  normalizedUrl: string,
  platform: string,
  processingTimeMs: number
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const record = toRecord(snapshot, sourceUrl, normalizedUrl, platform, processingTimeMs);

  const { data, error } = await sb
    .from('snapshots')
    .insert(record)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save snapshot:', error.message);
    return null;
  }

  return data?.id || null;
}

import type { FeedbackItem, FeedbackReport } from '../services/collector';

export async function saveFeedbackItems(
  items: FeedbackItem[],
  productName: string,
  snapshotId?: string | null
): Promise<number> {
  const sb = getSupabase();
  if (!sb || items.length === 0) return 0;

  const rows = items.map(item => ({
    snapshot_id: snapshotId || null,
    product_name: productName,
    channel: item.channel,
    title: item.title,
    content: item.content.slice(0, 2000),
    author: item.author,
    url: item.url,
    date: item.date,
    upvotes: item.upvotes,
    sentiment: item.sentiment,
    sentiment_score: item.sentimentScore,
    themes: item.themes,
  }));

  const { error } = await sb.from('feedback_items').insert(rows);
  if (error) {
    console.error('Failed to save feedback items:', error.message);
    return 0;
  }
  return rows.length;
}

export async function getCachedFeedback(productName: string): Promise<FeedbackReport | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('feedback_items')
    .select('*')
    .eq('product_name', productName)
    .order('upvotes', { ascending: false });

  if (error || !data || data.length === 0) return null;

  const items: FeedbackItem[] = data.map(row => ({
    id: row.id,
    channel: row.channel as FeedbackItem['channel'],
    title: row.title || '',
    content: row.content || '',
    author: row.author || '',
    url: row.url || '',
    date: row.date || '',
    upvotes: row.upvotes || 0,
    sentiment: row.sentiment as FeedbackItem['sentiment'] || 'neutral',
    sentimentScore: row.sentiment_score || 0.5,
    themes: row.themes || [],
  }));

  const positiveCount = items.filter(i => i.sentiment === 'positive').length;
  const negativeCount = items.filter(i => i.sentiment === 'negative').length;
  const neutralCount = items.filter(i => i.sentiment === 'neutral').length;
  const aggregatedSentiment = items.length > 0
    ? items.reduce((sum, i) => sum + i.sentimentScore, 0) / items.length
    : 0.5;

  const themeMap = new Map<string, { count: number; sentiments: string[] }>();
  for (const item of items) {
    for (const theme of item.themes) {
      if (!themeMap.has(theme)) themeMap.set(theme, { count: 0, sentiments: [] });
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
          ? 'negative' : 'neutral' as 'positive' | 'negative' | 'neutral',
    }));

  const channelMap = new Map<string, number>();
  for (const item of items) {
    channelMap.set(item.channel, (channelMap.get(item.channel) || 0) + 1);
  }
  const channels = [...channelMap.entries()].map(([channel, count]) => ({ channel, count }));

  return {
    items,
    totalFound: items.length,
    positiveCount,
    negativeCount,
    neutralCount,
    topThemes,
    channels,
    aggregatedSentiment,
  };
}

export async function getCachedSnapshot(normalizedUrl: string): Promise<SnapshotRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('snapshots')
    .select('*')
    .eq('normalized_url', normalizedUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Cache valid for 24 hours
  const createdAt = new Date(data.created_at);
  const age = Date.now() - createdAt.getTime();
  if (age > 24 * 60 * 60 * 1000) return null;

  return data as SnapshotRecord;
}
