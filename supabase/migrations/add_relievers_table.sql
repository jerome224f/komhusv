-- ============================================================
-- WORKFORCE HRMS - Relievers Table Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. CREATE RELIEVERS TABLE
-- Stores named relievers (can be external contractors or internal employees)
CREATE TABLE IF NOT EXISTS relievers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  mobile_number    TEXT,
  designation      TEXT,
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADD reliever_id TO attendance_records
-- This new column references the dedicated relievers table
-- The old reliever_employee_id column is kept for backward compatibility
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS reliever_id UUID REFERENCES relievers(id) ON DELETE SET NULL;

-- 3. ROW LEVEL SECURITY
ALTER TABLE relievers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_relievers"
  ON relievers
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_relievers_org ON relievers(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_reliever_id ON attendance_records(reliever_id);
