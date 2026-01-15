-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON public.visits(visit_date);
