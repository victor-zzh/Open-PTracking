import { getCachedSnapshot, saveSnapshot } from './supabase';
import { normalizeUrl } from './url';
import type { Snapshot, SnapshotRecord } from './types';

// In-memory cache fallback when Supabase is not configured
const memoryCache = new Map<string, { snapshot: Snapshot; timestamp: number; id: string }>();

export async function checkCache(url: string): Promise<{ hit: boolean; snapshot?: Snapshot; cachedAt?: string }> {
  const normalized = normalizeUrl(url);

  // Try Supabase first
  const record = await getCachedSnapshot(normalized);
  if (record) {
    const snapshot = record.raw_json as unknown as Snapshot;
    return { hit: true, snapshot, cachedAt: record.created_at };
  }

  // Fallback to memory cache
  const cached = memoryCache.get(normalized);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < 24 * 60 * 60 * 1000) {
      return {
        hit: true,
        snapshot: cached.snapshot,
        cachedAt: new Date(cached.timestamp).toISOString(),
      };
    }
    memoryCache.delete(normalized);
  }

  return { hit: false };
}

export async function storeResult(
  snapshot: Snapshot,
  sourceUrl: string,
  platform: string,
  processingTimeMs: number
): Promise<void> {
  const normalized = normalizeUrl(sourceUrl);

  // Try Supabase
  const id = await saveSnapshot(snapshot, sourceUrl, normalized, platform, processingTimeMs);

  // Also store in memory cache
  memoryCache.set(normalized, {
    snapshot,
    timestamp: Date.now(),
    id: id || `mem-${Date.now()}`,
  });
}
