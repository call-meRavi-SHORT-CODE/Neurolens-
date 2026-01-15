-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- PROFILES HANDLER FOR SUPABASE AUTH
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    name,
    email,
    hospital_name,
    hospital_location
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'hospital_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'hospital_location', '')
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

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

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- PATIENTS POLICIES
CREATE POLICY "patients_select_own"
ON public.patients
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "patients_insert_own"
ON public.patients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patients_update_own"
ON public.patients
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "patients_delete_own"
ON public.patients
FOR DELETE
USING (auth.uid() = user_id);

-- VISITS POLICIES
CREATE POLICY "visits_select_own"
ON public.visits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "visits_insert_own"
ON public.visits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "visits_update_own"
ON public.visits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "visits_delete_own"
ON public.visits
FOR DELETE
USING (auth.uid() = user_id);

-- =========================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

-- =========================================================
-- UPDATED_AT TRIGGERS (REAL TABLES ONLY)
-- =========================================================

DROP TRIGGER IF EXISTS set_updated_at_patients ON public.patients;
CREATE TRIGGER set_updated_at_patients
BEFORE UPDATE ON public.patients
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_visits ON public.visits;
CREATE TRIGGER set_updated_at_visits
BEFORE UPDATE ON public.visits
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON public.visits(visit_date);

-- =========================================================
-- MEAN BLOOD PRESSURE FUNCTION (SAFE)
-- =========================================================

CREATE OR REPLACE FUNCTION public.calculate_mean_bp(
  systolic INTEGER,
  diastolic INTEGER
)
RETURNS DECIMAL(4,1)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF systolic IS NULL OR diastolic IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN ROUND((systolic + 2 * diastolic) / 3.0, 1);
END;
$$;
