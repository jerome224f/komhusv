-- ============================================================
-- WORKFORCE HRMS - Complete Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('Super Admin', 'HR Executive', 'Manager')),
  email      TEXT
);

-- Default admin user (change password after first login!)
INSERT INTO users (username, password, name, role, email)
VALUES ('admin', 'admin123', 'System Administrator', 'Super Admin', 'admin@vstaff.com')
ON CONFLICT (username) DO NOTHING;

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_number TEXT,
  address        TEXT,
  email          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  head_of_department  TEXT,
  description         TEXT
);

-- 4. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  mobile_number           TEXT,
  gender                  TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  dob                     DATE,
  address                 TEXT,
  aadhaar_number          TEXT,
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department              TEXT,
  designation             TEXT,
  joining_date            DATE,
  status                  TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Resigned', 'Terminated')),
  salary_type             TEXT NOT NULL DEFAULT 'Monthly Salary' CHECK (salary_type IN ('Daily Wage', 'Monthly Salary')),
  daily_wage_amount       NUMERIC(12, 2) DEFAULT 0,
  monthly_salary_amount   NUMERIC(12, 2) DEFAULT 0,
  overtime_rate_per_hour  NUMERIC(12, 2) DEFAULT 0
);

-- 5. RELIEVERS TABLE (must be created BEFORE attendance_records which references it)
CREATE TABLE IF NOT EXISTS relievers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  mobile_number   TEXT,
  designation     TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Week Off')),
  overtime_hours        NUMERIC(5, 2) DEFAULT 0,
  reliever_employee_id  UUID REFERENCES employees(id) ON DELETE SET NULL,
  reliever_id           UUID REFERENCES relievers(id) ON DELETE SET NULL,
  UNIQUE(employee_id, date)
);

-- 7. ADVANCES TABLE
CREATE TABLE IF NOT EXISTS advances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  amount      NUMERIC(12, 2) NOT NULL,
  remarks     TEXT
);

-- 8. PAYROLLS TABLE
CREATE TABLE IF NOT EXISTS payrolls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month               TEXT NOT NULL,
  present_days        NUMERIC(5, 2) DEFAULT 0,
  absent_days         NUMERIC(5, 2) DEFAULT 0,
  half_days           NUMERIC(5, 2) DEFAULT 0,
  overtime_hours      NUMERIC(5, 2) DEFAULT 0,
  gross_salary        NUMERIC(12, 2) DEFAULT 0,
  advance_deductions  NUMERIC(12, 2) DEFAULT 0,
  net_salary          NUMERIC(12, 2) DEFAULT 0,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

-- 9. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action      TEXT NOT NULL,
  description TEXT
);

-- 10. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS system_notifications (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title     TEXT NOT NULL,
  message   TEXT,
  type      TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- ROW LEVEL SECURITY - Allow anon key full access (development)
-- ============================================================
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE relievers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow_all_users"                ON users;
  DROP POLICY IF EXISTS "allow_all_organizations"        ON organizations;
  DROP POLICY IF EXISTS "allow_all_departments"          ON departments;
  DROP POLICY IF EXISTS "allow_all_employees"            ON employees;
  DROP POLICY IF EXISTS "allow_all_relievers"            ON relievers;
  DROP POLICY IF EXISTS "allow_all_attendance_records"   ON attendance_records;
  DROP POLICY IF EXISTS "allow_all_advances"             ON advances;
  DROP POLICY IF EXISTS "allow_all_payrolls"             ON payrolls;
  DROP POLICY IF EXISTS "allow_all_activity_logs"        ON activity_logs;
  DROP POLICY IF EXISTS "allow_all_system_notifications" ON system_notifications;
END $$;

CREATE POLICY "allow_all_users"                ON users                FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_organizations"        ON organizations        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_departments"          ON departments          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_employees"            ON employees            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_relievers"            ON relievers            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_attendance_records"   ON attendance_records   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_advances"             ON advances             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payrolls"             ON payrolls             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_activity_logs"        ON activity_logs        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_system_notifications" ON system_notifications FOR ALL TO anon USING (true) WITH CHECK (true);
