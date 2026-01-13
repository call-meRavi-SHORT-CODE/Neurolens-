-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dob DATE,
  age INTEGER,
  gender TEXT,
  mrn TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  height DECIMAL(5,2), -- Height in cm
  weight DECIMAL(5,2), -- Weight in kg
  bmi DECIMAL(4,1), -- BMI calculated and stored
  blood_group TEXT,
  physician TEXT,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  technician TEXT,
  location TEXT,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Vital Signs
  age INTEGER, -- Age at time of visit (may differ from patient age)
  heart_rate INTEGER,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  mean_bp DECIMAL(4,1), -- Calculated Mean Blood Pressure
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  temperature DECIMAL(4,1),
  spo2 INTEGER,
  -- Medical History - stored as comma-separated diseases
  diseases TEXT, -- Replaces individual boolean columns
  -- ePWV Results
  epwv_result DECIMAL(4,1),
  epwv_risk_level TEXT,
  epwv_recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients
CREATE POLICY "Users can view their own patients" 
ON public.patients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients" 
ON public.patients 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients" 
ON public.patients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for visits
CREATE POLICY "Users can view their own visits" 
ON public.visits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own visits" 
ON public.visits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visits" 
ON public.visits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visits" 
ON public.visits 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
BEFORE UPDATE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_patients_mrn ON public.patients(mrn);
CREATE INDEX idx_visits_patient_id ON public.visits(patient_id);
CREATE INDEX idx_visits_user_id ON public.visits(user_id);
CREATE INDEX idx_visits_date ON public.visits(visit_date);

-- Create function to calculate mean blood pressure
CREATE OR REPLACE FUNCTION calculate_mean_bp(systolic INTEGER, diastolic INTEGER)
RETURNS DECIMAL(4,1) AS $$
BEGIN
  IF systolic IS NULL OR diastolic IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((systolic + 2 * diastolic) / 3.0, 1);
END;
$$ LANGUAGE plpgsql;