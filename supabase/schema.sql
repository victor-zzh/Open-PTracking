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
