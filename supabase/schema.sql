-- Open-PTracking Database Schema
-- Run this in Supabase SQL Editor to set up the database

CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  platform TEXT,
  product_name TEXT,
  tagline TEXT,
  founded TEXT,
  team_size TEXT,
  target_users TEXT[],
  category TEXT[],
  pricing JSONB,
  features TEXT[],
  competitors JSONB,
  sentiment JSONB,
  summary JSONB,
  raw_markdown TEXT,
  raw_json JSONB,
  language TEXT,
  confidence REAL,
  processing_time_ms INTEGER,
  fetch_error TEXT,
  llm_warning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookup by normalized URL
CREATE INDEX IF NOT EXISTS idx_snapshots_normalized_url ON snapshots(normalized_url);

-- Index for recent snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at DESC);

-- Multi-channel user feedback items
CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('reddit', 'hackernews', 'producthunt', 'twitter', 'web')),
  title TEXT,
  content TEXT,
  author TEXT,
  url TEXT,
  date TIMESTAMPTZ,
  upvotes INTEGER DEFAULT 0,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  sentiment_score REAL,
  themes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up feedback by product name
CREATE INDEX IF NOT EXISTS idx_feedback_product ON feedback_items(product_name);

-- Index for looking up feedback by channel
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON feedback_items(channel);

-- Index for feedback linked to a snapshot
CREATE INDEX IF NOT EXISTS idx_feedback_snapshot ON feedback_items(snapshot_id);
