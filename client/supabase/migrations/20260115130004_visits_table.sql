-- =========================================================
-- VISITS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  technician TEXT,
  location TEXT,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  age INTEGER,
  heart_rate INTEGER,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  mean_bp DECIMAL(4,1),
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  temperature DECIMAL(4,1),
  spo2 INTEGER,
  diseases TEXT,
  epwv_result DECIMAL(4,1),
  epwv_risk_level TEXT,
  epwv_recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
