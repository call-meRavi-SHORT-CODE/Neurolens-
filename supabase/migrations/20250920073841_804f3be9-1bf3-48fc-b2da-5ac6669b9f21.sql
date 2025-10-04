-- Fix function search path security issue
CREATE OR REPLACE FUNCTION calculate_mean_bp(systolic INTEGER, diastolic INTEGER)
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