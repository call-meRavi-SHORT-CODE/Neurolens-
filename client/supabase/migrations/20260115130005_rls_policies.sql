-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PATIENTS POLICIES
-- =========================================================

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

-- =========================================================
-- VISITS POLICIES
-- =========================================================

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
