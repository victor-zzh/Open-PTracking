export interface PricingTier {
  name: string;
  price: number;
  period?: 'month' | 'year' | 'one-time';
}

export interface CompetitorRef {
  name: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Sentiment {
  positive: string[];
  negative: string[];
  score: number; // 0-1
}

export interface SnapshotSource {
  url: string;
  platform: string;
  originalUrl: string;
}

export interface SnapshotProduct {
  name: string;
  tagline: string;
  founded: string | null;
  teamSize: string | null;
  url: string;
}

export interface SnapshotAnalysis {
  targetUsers: string[];
  category: string[];
  pricing: {
    model: string;
    tiers: PricingTier[];
  };
  features: string[];
  competitors: CompetitorRef[];
  sentiment: Sentiment;
}

export interface SnapshotMeta {
  sourcesAnalyzed: number;
  processingTime: number; // ms
  language: string;
  confidence: number; // 0-1
}

export interface Snapshot {
  id?: string;
  source: SnapshotSource;
  product: SnapshotProduct;
  analysis: SnapshotAnalysis;
  meta: SnapshotMeta;
  version: string;
  analyzedAt: string;
}

export interface SnapshotRecord {
  id: string;
  source_url: string;
  normalized_url: string;
  platform: string;
  product_name: string;
  tagline: string;
  founded: string | null;
  team_size: string | null;
  target_users: string[];
  category: string[];
  pricing: Record<string, unknown>;
  features: string[];
  competitors: Record<string, unknown>[];
  sentiment: Record<string, unknown>;
  summary: Record<string, unknown>;
  raw_markdown: string;
  raw_json: Record<string, unknown>;
  language: string;
  confidence: number;
  processing_time_ms: number;
  fetch_error: string | null;
  llm_warning: string | null;
  created_at: string;
}

export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  error?: string;
}

export interface ExtractedContent {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  h1Text: string;
  markdown: string;
  textContent: string;
  language: string;
  wordCount: number;
}

export interface CrawlOptions {
  timeout: number;
  maxRetries: number;
  usePlaywright: boolean;
}
