import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Calculator, Heart, Activity, User, CheckCircle2, Stethoscope, ClipboardList, Upload, RotateCcw, AlertTriangle, Download, FileText, TrendingUp, Camera } from "lucide-react";
import { EpwvCalculator } from "./EpwvCalculator";
import { PatientSearch } from "./PatientSearch";
import { Patient, createVisit, getDiseasesList, formatDiseases } from "@/lib/database";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";

interface NewVisitProps {
  onBack: () => void;
}

interface StrokeRiskResults {
  success: boolean;
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  cimt_value: number;
  epwv_value: number;
  retinal_occlusion_prob: number;
  eye_risk: number;
  brain_risk: number;
  recommendation: string;
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [strokeResults, setStrokeResults] = useState<StrokeRiskResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    { title: "Medical History", icon: Stethoscope },
    { title: "Retinal Analysis", icon: Camera },
    { title: "Risk Assessment", icon: Activity }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStrokeResults(null);
    setError(null);
  };

  const calculateStrokeRisk = async () => {
    if (!capturedImage || !visitData.age || !visitData.systolic || !visitData.diastolic) {
      setError("Please fill in all required fields and upload an image");
      return;
    }

    try {
      setError(null);
      setIsCalculating(true);
      
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], "retinal_image.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("age", visitData.age);
      formData.append("systolic_bp", visitData.systolic);
      formData.append("diastolic_bp", visitData.diastolic);

      const apiResponse = await fetch("http://localhost:8000/predict-risk", {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || "Failed to calculate risk score");
      }

      const result = await apiResponse.json();
      
      if (result.success) {
        setStrokeResults(result);
        setCurrentStep(5); // Move to results step
      } else {
        throw new Error("Failed to get risk assessment result");
      }
    } catch (error) {
      console.error("Error calculating risk score:", error);
      setError(error instanceof Error ? error.message : "Failed to calculate risk score. Please try again.");
    } finally {
      setIsCalculating(false);
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
          <Card className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">Visit Information</CardTitle>
                  <CardDescription className="text-xs">Basic information about this visit</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {selectedPatient && (
                <div className="p-4 bg-slate-800 border border-blue-500/30 rounded-xl">
                  <p className="text-sm font-semibold text-white">Selected Patient: {selectedPatient.name}</p>
                  <p className="text-xs text-slate-400">MRN: {selectedPatient.mrn}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium text-slate-300">Reason for Visit *</Label>
                <Input
                  id="reason"
                  value={visitData.reason}
                  onChange={(e) => setVisitData({ ...visitData, reason: e.target.value })}
                  placeholder="e.g., Routine screening, Follow-up"
                  className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="technician" className="text-sm font-medium text-slate-300">Technician</Label>
                  <Input
                    id="technician"
                    value={visitData.technician}
                    onChange={(e) => setVisitData({ ...visitData, technician: e.target.value })}
                    placeholder="Technician name"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-slate-300">Location</Label>
                  <Select onValueChange={(value) => setVisitData({ ...visitData, location: value })}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-700 focus:border-cyan-500">
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
          <Card className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">Vital Signs</CardTitle>
                  <CardDescription className="text-xs">Record patient's current vital measurements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-slate-300">Age (years) *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={visitData.age}
                    onChange={(e) => setVisitData({ ...visitData, age: e.target.value })}
                    placeholder="Enter age"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartRate" className="text-sm font-medium text-slate-300">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={visitData.heartRate}
                    onChange={(e) => setVisitData({ ...visitData, heartRate: e.target.value })}
                    placeholder="Enter heart rate"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systolic" className="text-sm font-medium text-slate-300">Systolic BP (mmHg) *</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={visitData.systolic}
                    onChange={(e) => setVisitData({ ...visitData, systolic: e.target.value })}
                    placeholder="Enter systolic BP"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic" className="text-sm font-medium text-slate-300">Diastolic BP (mmHg) *</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={visitData.diastolic}
                    onChange={(e) => setVisitData({ ...visitData, diastolic: e.target.value })}
                    placeholder="Enter diastolic BP"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-medium text-slate-300">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={visitData.height}
                    onChange={(e) => setVisitData({ ...visitData, height: e.target.value })}
                    placeholder="Enter height"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-medium text-slate-300">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={visitData.weight}
                    onChange={(e) => setVisitData({ ...visitData, weight: e.target.value })}
                    placeholder="Enter weight"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm font-medium text-slate-300">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={visitData.temperature}
                    onChange={(e) => setVisitData({ ...visitData, temperature: e.target.value })}
                    placeholder="Enter temperature"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spO2" className="text-sm font-medium text-slate-300">SpO₂ (%)</Label>
                  <Input
                    id="spO2"
                    type="number"
                    value={visitData.spO2}
                    onChange={(e) => setVisitData({ ...visitData, spO2: e.target.value })}
                    placeholder="Enter oxygen saturation"
                    className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
              {getMeanBP() && (
                <div className="p-4 bg-slate-800 border border-green-500/30 rounded-xl">
                  <p className="text-sm">
                    <span className="font-semibold text-white">Mean Blood Pressure:</span> 
                    <span className="ml-2 text-green-600 dark:text-green-400 font-bold">{getMeanBP()} mmHg</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="bg-slate-900 border border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">Medical History</CardTitle>
                  <CardDescription className="text-xs">Select relevant medical conditions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getDiseasesList().map((disease) => (
                  <div key={disease} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <Checkbox
                      id={disease}
                      checked={selectedDiseases.includes(disease)}
                      onCheckedChange={(checked) => handleDiseaseChange(disease, checked as boolean)}
                      className="border-slate-600"
                    />
                    <Label htmlFor={disease} className="text-sm text-slate-300 cursor-pointer">{disease}</Label>
                  </div>
                ))}
              </div>
              {selectedDiseases.length > 0 && (
                <div className="p-4 bg-slate-800 border border-purple-500/30 rounded-xl">
                  <p className="text-sm font-semibold text-white mb-3">Selected Conditions ({selectedDiseases.length}):</p>
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
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Retinal Image Upload</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Upload fundus image for stroke risk analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <div
                    className="aspect-square bg-slate-800/50 rounded-2xl flex items-center justify-center relative overflow-hidden border-2 border-dashed border-blue-500/50 cursor-pointer hover:border-blue-400 hover:bg-slate-700/50 transition-all duration-300 shadow-inner"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => !capturedImage && fileInputRef.current?.click()}
                  >
                    {capturedImage ? (
                      <div className="relative w-full h-full group">
                        <img 
                          src={capturedImage} 
                          alt="Captured retinal image" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-lg">
                          <Upload className="w-10 h-10 text-blue-400" />
                        </div>
                        <p className="text-gray-900 text-white mb-2 font-bold text-lg">
                          Upload Fundus Image
                        </p>
                        <p className="text-sm text-slate-400 mb-3">
                          Click or drag to upload
                        </p>
                        <p className="text-xs text-slate-400 bg-slate-700/50 rounded-lg px-4 py-2 inline-block">
                          JPG, PNG formats supported
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center gap-4 mt-4">
                    {capturedImage && (
                      <Button onClick={handleRetake} variant="outline" className="rounded-xl border-gray-300 hover:bg-slate-800">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Change Image
                      </Button>
                    )}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Visit Summary</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Review before analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {selectedPatient && (
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl">
                    <h4 className="text-sm font-bold mb-2 text-white">Patient</h4>
                    <p className="text-sm text-slate-300">{selectedPatient.name}</p>
                    <p className="text-xs text-slate-400">MRN: {selectedPatient.mrn}</p>
                  </div>
                )}

                <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl">
                  <h4 className="text-sm font-bold mb-2 text-white">Vital Signs</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Age:</span>
                      <span className="ml-2 font-semibold text-white">{visitData.age} yrs</span>
                    </div>
                    <div>
                      <span className="text-slate-400">BP:</span>
                      <span className="ml-2 font-semibold text-white">{visitData.systolic}/{visitData.diastolic}</span>
                    </div>
                    {visitData.heartRate && (
                      <div>
                        <span className="text-slate-400">HR:</span>
                        <span className="ml-2 font-semibold text-white">{visitData.heartRate} bpm</span>
                      </div>
                    )}
                    {getMeanBP() && (
                      <div>
                        <span className="text-slate-400">MBP:</span>
                        <span className="ml-2 font-semibold text-white">{getMeanBP()} mmHg</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDiseases.length > 0 && (
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                    <h4 className="text-sm font-bold mb-2 text-white">Medical History</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDiseases.map((disease) => (
                        <Badge key={disease} className="bg-purple-500 text-white rounded-lg text-xs">
                          {disease}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={calculateStrokeRisk}
                  disabled={!capturedImage || isCalculating}
                  className="w-full mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg py-6"
                >
                  {isCalculating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5 mr-2" />
                      Analyze Stroke Risk
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        if (!strokeResults) return null;
        const age = parseFloat(visitData.age);
        const mbp = parseFloat(getMeanBP() || "0");
        
        return (
          <div className="space-y-6">
            {/* Risk Assessment Card */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Stroke Risk Assessment</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
                  <div className="relative">
                    <RiskGauge value={strokeResults.risk_score} size={220} strokeWidth={18} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl font-black text-white">{Math.round(strokeResults.risk_score)}</div>
                        <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Score</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 text-center lg:text-left">
                    <div>
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Risk Level</p>
                      <div className={`inline-flex items-center px-8 py-4 rounded-2xl text-2xl font-bold shadow-lg border-2 transition-all ${
                        strokeResults.risk_level === "Low" 
                          ? "bg-green-500 text-white border-green-600 shadow-green-200 dark:shadow-green-900" 
                          : strokeResults.risk_level === "Medium"
                          ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-200 dark:shadow-yellow-900"
                          : "bg-red-500 text-white border-red-600 shadow-red-200 dark:shadow-red-900"
                      }`}>
                        {strokeResults.risk_level} Risk
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Measurements */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 p-5">
                <CardTitle className="text-xl font-bold text-white">Clinical Measurements</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
                    <p className="text-xs text-slate-400 mb-1">CIMT Value</p>
                    <p className="text-lg font-bold text-white">{strokeResults.cimt_value.toFixed(3)} mm</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                    <p className="text-xs text-slate-400 mb-1">ePWV</p>
                    <p className="text-lg font-bold text-white">{strokeResults.epwv_value.toFixed(2)} m/s</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                    <p className="text-xs text-slate-400 mb-1">Retinal Occlusion</p>
                    <p className="text-lg font-bold text-white">{(strokeResults.retinal_occlusion_prob * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-xl border border-teal-500/20">
                    <p className="text-xs text-slate-400 mb-1">Eye Risk</p>
                    <p className="text-lg font-bold text-white">{(strokeResults.eye_risk * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                    <p className="text-xs text-slate-400 mb-1">Brain Risk</p>
                    <p className="text-lg font-bold text-white">{(strokeResults.brain_risk * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-5">
                <CardTitle className="text-xl font-bold text-white">Clinical Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className={
                  strokeResults.risk_level === "High" ? "border-2 border-red-500/50 bg-gradient-to-br from-red-500/10 to-orange-500/10" :
                  strokeResults.risk_level === "Medium" ? "border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-amber-500/10" :
                  "border-2 border-green-500/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
                }>
                  <AlertTriangle className={`h-5 w-5 ${
                    strokeResults.risk_level === "High" ? "text-red-500" :
                    strokeResults.risk_level === "Medium" ? "text-yellow-500" :
                    "text-green-500"
                  }`} />
                  <AlertDescription className="text-sm leading-relaxed text-slate-200 font-medium">
                    {strokeResults.recommendation}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
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
        return capturedImage !== null;
      case 5:
        return strokeResults !== null;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      {/* Top Navigation Bar */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="rounded-xl hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">New Visit</h1>
                <p className="text-xs text-slate-400">Step {currentStep + 1} of 6</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    step === currentStep
                      ? "bg-blue-500 text-white shadow-md"
                      : step < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-400 border border-slate-600"
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
            className="rounded-xl bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button
            onClick={() => currentStep < 5 ? setCurrentStep(currentStep + 1) : handleCompleteVisit()}
            disabled={!canProceed()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm disabled:opacity-50"
          >
            {currentStep === 5 ? "Complete Visit" : currentStep === 4 ? "Continue" : "Next Step"}
            {currentStep < 5 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};