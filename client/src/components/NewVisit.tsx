import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calculator, Heart, Activity, User, CheckCircle2, Stethoscope, ClipboardList } from "lucide-react";
import { EpwvCalculator } from "./EpwvCalculator";
import { PatientSearch } from "./PatientSearch";
import { Patient, createVisit, getDiseasesList, formatDiseases } from "@/lib/database";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

interface NewVisitProps {
  onBack: () => void;
}

export const NewVisit = ({ onBack }: NewVisitProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0); // Start with patient selection
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [visitData, setVisitData] = useState({
    reason: "",
    technician: "",
    location: "",
    age: "",
    heartRate: "",
    systolic: "",
    diastolic: "",
    height: "",
    weight: "",
    temperature: "",
    spO2: ""
  });
  const [epwvData, setEpwvData] = useState({
    result: null as number | null,
    riskLevel: "",
    recommendations: ""
  });

  // Refs for GSAP animations
  const headerRef = useRef(null);
  const contentRef = useRef(null);

  // GSAP Animation on mount and step change
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );

      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: "power3.out" }
      );
    });

    return () => ctx.revert();
  }, [currentStep]);

  const getMeanBP = () => {
    const sys = parseFloat(visitData.systolic);
    const dia = parseFloat(visitData.diastolic);
    if (sys && dia) {
      return ((sys + 2 * dia) / 3).toFixed(1);
    }
    return null;
  };

  const steps = [
    { title: "Patient Selection", icon: User },
    { title: "Visit Information", icon: Activity },
    { title: "Vital Signs", icon: Heart },
    { title: "Medical History", icon: Activity },
    { title: "ePWV Analysis", icon: Calculator }
  ];

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep(1);
  };

  const handleNewPatient = () => {
    navigate("/new-patient");
  };

  const handleDiseaseChange = (disease: string, checked: boolean) => {
    if (checked) {
      setSelectedDiseases(prev => [...prev, disease]);
    } else {
      setSelectedDiseases(prev => prev.filter(d => d !== disease));
    }
  };

  const handleCompleteVisit = async () => {
    if (!selectedPatient) return;

    try {
      const visitPayload = {
        patient_id: selectedPatient.id,
        reason: visitData.reason,
        technician: visitData.technician || null,
        location: visitData.location || null,
        visit_date: new Date().toISOString(),
        age: visitData.age ? parseInt(visitData.age) : null,
        heart_rate: visitData.heartRate ? parseInt(visitData.heartRate) : null,
        systolic: parseInt(visitData.systolic),
        diastolic: parseInt(visitData.diastolic),
        height: visitData.height ? parseFloat(visitData.height) : null,
        weight: visitData.weight ? parseFloat(visitData.weight) : null,
        temperature: visitData.temperature ? parseFloat(visitData.temperature) : null,
        spo2: visitData.spO2 ? parseInt(visitData.spO2) : null,
        diseases: formatDiseases(selectedDiseases),
        epwv_result: epwvData.result,
        epwv_risk_level: epwvData.riskLevel || null,
        epwv_recommendations: epwvData.recommendations || null
      };

      await createVisit(visitPayload);

      toast({
        title: "Visit Completed",
        description: `Visit for ${selectedPatient.name} has been saved successfully.`,
        variant: "default"
      });

      onBack();
    } catch (error) {
      console.error('Error saving visit:', error);
      toast({
        title: "Visit Save Failed",
        description: "Failed to save visit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PatientSearch 
            onPatientSelect={handlePatientSelect}
            onNewPatient={handleNewPatient}
          />
        );

      case 1:
        return (
          <Card className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-200 dark:border-border bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-foreground">Visit Information</CardTitle>
                  <CardDescription className="text-xs">Basic information about this visit</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {selectedPatient && (
                <div className="p-4 bg-white dark:bg-card border border-blue-300 dark:border-blue-800 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground">Selected Patient: {selectedPatient.name}</p>
                  <p className="text-xs text-gray-600 dark:text-muted-foreground">MRN: {selectedPatient.mrn}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Visit *</Label>
                <Input
                  id="reason"
                  value={visitData.reason}
                  onChange={(e) => setVisitData({ ...visitData, reason: e.target.value })}
                  placeholder="e.g., Routine screening, Follow-up"
                  className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="technician" className="text-sm font-medium text-gray-700 dark:text-gray-300">Technician</Label>
                  <Input
                    id="technician"
                    value={visitData.technician}
                    onChange={(e) => setVisitData({ ...visitData, technician: e.target.value })}
                    placeholder="Technician name"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</Label>
                  <Select onValueChange={(value) => setVisitData({ ...visitData, location: value })}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-300 dark:border-border">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic-a">Clinic A</SelectItem>
                      <SelectItem value="clinic-b">Clinic B</SelectItem>
                      <SelectItem value="mobile-unit">Mobile Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-200 dark:border-border bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-foreground">Vital Signs</CardTitle>
                  <CardDescription className="text-xs">Record patient's current vital measurements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-gray-700 dark:text-gray-300">Age (years) *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={visitData.age}
                    onChange={(e) => setVisitData({ ...visitData, age: e.target.value })}
                    placeholder="Enter age"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartRate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={visitData.heartRate}
                    onChange={(e) => setVisitData({ ...visitData, heartRate: e.target.value })}
                    placeholder="Enter heart rate"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systolic" className="text-sm font-medium text-gray-700 dark:text-gray-300">Systolic BP (mmHg) *</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={visitData.systolic}
                    onChange={(e) => setVisitData({ ...visitData, systolic: e.target.value })}
                    placeholder="Enter systolic BP"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic" className="text-sm font-medium text-gray-700 dark:text-gray-300">Diastolic BP (mmHg) *</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={visitData.diastolic}
                    onChange={(e) => setVisitData({ ...visitData, diastolic: e.target.value })}
                    placeholder="Enter diastolic BP"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-medium text-gray-700 dark:text-gray-300">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={visitData.height}
                    onChange={(e) => setVisitData({ ...visitData, height: e.target.value })}
                    placeholder="Enter height"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={visitData.weight}
                    onChange={(e) => setVisitData({ ...visitData, weight: e.target.value })}
                    placeholder="Enter weight"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={visitData.temperature}
                    onChange={(e) => setVisitData({ ...visitData, temperature: e.target.value })}
                    placeholder="Enter temperature"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spO2" className="text-sm font-medium text-gray-700 dark:text-gray-300">SpO₂ (%)</Label>
                  <Input
                    id="spO2"
                    type="number"
                    value={visitData.spO2}
                    onChange={(e) => setVisitData({ ...visitData, spO2: e.target.value })}
                    placeholder="Enter oxygen saturation"
                    className="h-11 rounded-xl border-gray-300 dark:border-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                  />
                </div>
              </div>
              {getMeanBP() && (
                <div className="p-4 bg-white dark:bg-card border border-green-300 dark:border-green-800 rounded-xl">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900 dark:text-foreground">Mean Blood Pressure:</span> 
                    <span className="ml-2 text-green-600 dark:text-green-400 font-bold">{getMeanBP()} mmHg</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-200 dark:border-border bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-foreground">Medical History</CardTitle>
                  <CardDescription className="text-xs">Select relevant medical conditions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getDiseasesList().map((disease) => (
                  <div key={disease} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Checkbox
                      id={disease}
                      checked={selectedDiseases.includes(disease)}
                      onCheckedChange={(checked) => handleDiseaseChange(disease, checked as boolean)}
                      className="border-gray-300"
                    />
                    <Label htmlFor={disease} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{disease}</Label>
                  </div>
                ))}
              </div>
              {selectedDiseases.length > 0 && (
                <div className="p-4 bg-white dark:bg-card border border-purple-300 dark:border-purple-800 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">Selected Conditions ({selectedDiseases.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDiseases.map((disease) => (
                      <Badge key={disease} className="bg-purple-500 text-white dark:bg-purple-600 rounded-lg px-3 py-1">
                        {disease}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        const age = parseFloat(visitData.age);
        const mbp = parseFloat(getMeanBP() || "0");
        return (
          <EpwvCalculator age={age} mbp={mbp} />
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedPatient !== null;
      case 1:
        return visitData.reason.trim() !== "";
      case 2:
        return visitData.age && visitData.systolic && visitData.diastolic;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-12">
      {/* Top Navigation Bar */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-white dark:bg-card border-b border-gray-200 dark:border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">New Visit</h1>
                <p className="text-xs text-gray-600 dark:text-muted-foreground">Step {currentStep + 1} of 5</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    step === currentStep
                      ? "bg-blue-500 text-white shadow-md"
                      : step < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onBack()}
            className="rounded-xl border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button
            onClick={() => currentStep < 4 ? setCurrentStep(currentStep + 1) : handleCompleteVisit()}
            disabled={!canProceed()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm disabled:opacity-50"
          >
            {currentStep === 4 ? "Complete Visit" : "Next Step"}
            {currentStep < 4 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};