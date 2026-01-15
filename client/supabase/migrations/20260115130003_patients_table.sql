-- =========================================================
-- PATIENTS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dob DATE,
  age INTEGER,
  gender TEXT,
  mrn TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  bmi DECIMAL(4,1),
  blood_group TEXT,
  physician TEXT,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
