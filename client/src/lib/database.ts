import { supabase } from "@/integrations/supabase/client";

// Types
export interface Patient {
  id: string;
  user_id: string;
  name: string;
  dob?: string;
  age?: number;
  gender?: string;
  mrn: string;
  phone?: string;
  address?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  blood_group?: string;
  physician?: string;
  allergies?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  user_id: string;
  reason: string;
  technician?: string;
  location?: string;
  visit_date: string;
  age?: number;
  heart_rate?: number;
  systolic: number;
  diastolic: number;
  mean_bp?: number;
  height?: number;
  weight?: number;
  temperature?: number;
  spo2?: number;
  diseases?: string;
  epwv_result?: number;
  epwv_risk_level?: string;
  epwv_recommendations?: string;
  created_at: string;
  updated_at: string;
}

export interface VisitWithPatient extends Visit {
  patient?: Patient;
}

// Patient database functions
export const createPatient = async (patientData: Omit<Patient, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...patientData,
      user_id: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPatients = async () => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getPatientById = async (id: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const updatePatient = async (id: string, updates: Partial<Patient>) => {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const searchPatients = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,mrn.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Visit database functions
export const createVisit = async (visitData: Omit<Visit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('visits')
    .insert({
      ...visitData,
      user_id: user.id,
      mean_bp: visitData.systolic && visitData.diastolic ? 
        parseFloat(((visitData.systolic + 2 * visitData.diastolic) / 3).toFixed(1)) : null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getVisits = async () => {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      patient:patients(*)
    `)
    .order('visit_date', { ascending: false });

  if (error) throw error;
  return data as VisitWithPatient[];
};

export const getVisitsByPatient = async (patientId: string) => {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('patient_id', patientId)
    .order('visit_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateVisit = async (id: string, updates: Partial<Visit>) => {
  const { data, error } = await supabase
    .from('visits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Utility functions
export const calculateBMI = (height: number, weight: number): number => {
  if (!height || !weight) return 0;
  const heightInM = height / 100;
  return parseFloat((weight / (heightInM * heightInM)).toFixed(1));
};

export const getDiseasesList = (): string[] => [
  'Diabetes',
  'Hypertension', 
  'Atrial Fibrillation',
  'Smoking History',
  'High Cholesterol',
  'Heart Disease',
  'Stroke',
  'Kidney Disease',
  'Family History'
];

export const formatDiseases = (diseases: string[]): string => {
  return diseases.join(', ');
};

export const parseDiseases = (diseasesString: string): string[] => {
  if (!diseasesString) return [];
  return diseasesString.split(', ').filter(d => d.trim() !== '');
};