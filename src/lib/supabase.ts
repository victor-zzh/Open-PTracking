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
