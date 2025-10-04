import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, Heart, Activity, User } from "lucide-react";
import { EpwvCalculator } from "./EpwvCalculator";
import { PatientSearch } from "./PatientSearch";
import { Patient, createVisit, getDiseasesList, formatDiseases } from "@/lib/database";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
          <Card>
            <CardHeader>
              <CardTitle>Visit Information</CardTitle>
              <CardDescription>Basic information about this visit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPatient && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm font-medium">Selected Patient: {selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">MRN: {selectedPatient.mrn}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Visit</Label>
                <Input
                  id="reason"
                  value={visitData.reason}
                  onChange={(e) => setVisitData({ ...visitData, reason: e.target.value })}
                  placeholder="e.g., Routine screening, Follow-up"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Technician</Label>
                  <Input
                    id="technician"
                    value={visitData.technician}
                    onChange={(e) => setVisitData({ ...visitData, technician: e.target.value })}
                    placeholder="Technician name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select onValueChange={(value) => setVisitData({ ...visitData, location: value })}>
                    <SelectTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs</CardTitle>
              <CardDescription>Record patient's current vital measurements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age (years) *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={visitData.age}
                    onChange={(e) => setVisitData({ ...visitData, age: e.target.value })}
                    placeholder="Enter age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={visitData.heartRate}
                    onChange={(e) => setVisitData({ ...visitData, heartRate: e.target.value })}
                    placeholder="Enter heart rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systolic">Systolic BP (mmHg) *</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={visitData.systolic}
                    onChange={(e) => setVisitData({ ...visitData, systolic: e.target.value })}
                    placeholder="Enter systolic BP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">Diastolic BP (mmHg) *</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={visitData.diastolic}
                    onChange={(e) => setVisitData({ ...visitData, diastolic: e.target.value })}
                    placeholder="Enter diastolic BP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={visitData.height}
                    onChange={(e) => setVisitData({ ...visitData, height: e.target.value })}
                    placeholder="Enter height"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={visitData.weight}
                    onChange={(e) => setVisitData({ ...visitData, weight: e.target.value })}
                    placeholder="Enter weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={visitData.temperature}
                    onChange={(e) => setVisitData({ ...visitData, temperature: e.target.value })}
                    placeholder="Enter temperature"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spO2">SpO₂ (%)</Label>
                  <Input
                    id="spO2"
                    type="number"
                    value={visitData.spO2}
                    onChange={(e) => setVisitData({ ...visitData, spO2: e.target.value })}
                    placeholder="Enter oxygen saturation"
                  />
                </div>
              </div>
              {getMeanBP() && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Mean Blood Pressure:</span> {getMeanBP()} mmHg
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Medical History</CardTitle>
              <CardDescription>Select relevant medical conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getDiseasesList().map((disease) => (
                  <div key={disease} className="flex items-center space-x-2">
                    <Checkbox
                      id={disease}
                      checked={selectedDiseases.includes(disease)}
                      onCheckedChange={(checked) => handleDiseaseChange(disease, checked as boolean)}
                    />
                    <Label htmlFor={disease}>{disease}</Label>
                  </div>
                ))}
              </div>
              {selectedDiseases.length > 0 && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected Conditions:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDiseases.map((disease) => (
                      <Badge key={disease} variant="secondary" className="text-xs">
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Visit</h1>
            <p className="text-muted-foreground">Start a new patient assessment</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            const Icon = step.icon;

            return (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isActive 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-success border-success text-success-foreground'
                        : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-px mx-4 ${isCompleted ? 'bg-success' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onBack()}
          >
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button
            onClick={() => currentStep < 4 ? setCurrentStep(currentStep + 1) : handleCompleteVisit()}
            disabled={!canProceed()}
            className="bg-primary hover:bg-primary/90"
          >
            {currentStep === 4 ? "Complete Visit" : "Next Step"}
          </Button>
        </div>
      </div>
    </div>
  );
};