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
