import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RotateCcw, CheckCircle, AlertTriangle, Upload, Heart, Calculator, Download, FileText, Activity, TrendingUp } from "lucide-react";
import { PatientSearch } from "./PatientSearch";
import { Patient } from "@/lib/database";
import { useNavigate } from "react-router-dom";

interface CameraInterfaceProps {
  onBack: () => void;
}

interface StrokeRiskResults {
  success: boolean;
  risk_score: number; // 0-100
  risk_level: "Low" | "Medium" | "High";
  cimt_value: number;
  epwv_value: number;
  retinal_occlusion_prob: number;
  eye_risk: number;
  brain_risk: number;
  recommendation: string;
}

export const CameraInterface = ({ onBack }: CameraInterfaceProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<"patient" | "capture" | "results">("patient");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [patientData, setPatientData] = useState({
    age: "",
    systolicBP: "",
    diastolicBP: ""
  });
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [results, setResults] = useState<StrokeRiskResults | null>(null);
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

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    // Pre-fill age if available
    if (patient.age) {
      setPatientData(prev => ({ ...prev, age: patient.age!.toString() }));
    }
    setCurrentStep("capture");
  };

  const handleNewPatient = () => {
    navigate("/new-patient");
  };


  const handleInputChange = (field: string, value: string) => {
    // Trim whitespace and ensure proper formatting for numeric fields
    let processedValue = value.trim();
    
    // For numeric fields, remove any non-numeric characters
    if (field === 'age' || field === 'systolicBP' || field === 'diastolicBP') {
      // For blood pressure fields, only allow integers (no decimals)
      if (field === 'systolicBP' || field === 'diastolicBP') {
        processedValue = processedValue.replace(/[^0-9]/g, '');
      } else {
        // For age, allow decimals
        processedValue = processedValue.replace(/[^0-9.]/g, '');
      }
    }
    
    setPatientData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    setError(null);
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
    setResults(null);
    setError(null);
  };

  const testBackendConnection = async () => {
    try {
      console.log("Testing backend connection...");
      const response = await fetch("http://localhost:8000/test");
      const data = await response.json();
      console.log("Backend test response:", data);
      return true;
    } catch (error) {
      console.error("Backend connection test failed:", error);
      return false;
    }
  };

  const calculateRiskScore = async () => {
    // Test backend connection first
    const isBackendConnected = await testBackendConnection();
    if (!isBackendConnected) {
      setError("Cannot connect to backend server. Please make sure the backend is running on http://localhost:8000");
      return;
    }

    // Validate inputs
    if (!patientData.age || !patientData.systolicBP || !patientData.diastolicBP) {
      setError("Please fill in all patient data fields");
      return;
    }

    if (!capturedImage) {
      setError("Please upload an image first");
      return;
    }

    const age = parseInt(patientData.age);
    const systolicBP = parseFloat(patientData.systolicBP);
    const diastolicBP = parseFloat(patientData.diastolicBP);

    if (isNaN(age) || isNaN(systolicBP) || isNaN(diastolicBP)) {
      setError("Please enter valid numeric values");
      return;
    }

    if (age < 0 || age > 120) {
      setError("Please enter a valid age (0-120)");
      return;
    }

    if (systolicBP < 50 || systolicBP > 300) {
      setError(`Systolic blood pressure must be between 50-300 mmHg`);
      return;
    }

    if (diastolicBP < 30 || diastolicBP > 200) {
      setError(`Diastolic blood pressure must be between 30-200 mmHg`);
      return;
    }

    if (diastolicBP >= systolicBP) {
      setError("Diastolic blood pressure must be less than systolic blood pressure");
      return;
    }

    try {
      setError(null);
      setIsCalculating(true);
      
      // Convert image URL to File object
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], "retinal_image.jpg", { type: "image/jpeg" });

      // Create FormData for the API request
      const formData = new FormData();
      formData.append("image", file);
      formData.append("age", age.toString());
      formData.append("systolic_bp", systolicBP.toString());
      formData.append("diastolic_bp", diastolicBP.toString());

      // Call the FastAPI backend
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
        setResults(result);
        setCurrentStep("results");
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

  const downloadPDFReport = async () => {
    if (!results || !selectedPatient) return;
    
    // TODO: Implement PDF generation
    alert("PDF download functionality will be implemented");
  };

  const getAge = (patient: Patient) => {
    if (patient.age) return patient.age;
    if (patient.dob) {
      const today = new Date();
      const birthDate = new Date(patient.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    return null;
  };

  // Patient Selection Step
  if (currentStep === "patient") {
    return (
      <div className="min-h-screen bg-black pb-12">
        {/* Top Navigation Bar */}
        <div ref={headerRef} className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-xl font-bold text-white">Stroke Risk Analysis</h1>
                <p className="text-xs text-sky-200">Select a patient to begin analysis</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <PatientSearch 
            onPatientSelect={handlePatientSelect}
            onNewPatient={handleNewPatient}
          />
        </div>
      </div>
    );
  }

  // Results Step
  if (currentStep === "results" && results && selectedPatient) {
    return (
      <div className="min-h-screen bg-black pb-12">
        {/* Top Navigation Bar */}
        <div ref={headerRef} className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep("capture")}
                  className="rounded-xl hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-white">Stroke Risk Analysis Results</h1>
                  <p className="text-xs text-sky-200">{selectedPatient.name} • {getAge(selectedPatient)}y • {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <Button onClick={downloadPDFReport} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
            </div>
          </div>
        </div>

        <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
          {/* Risk Category Card */}
          <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">Risk Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
                <div className="relative">
                  <RiskGauge value={results.risk_score} size={220} strokeWidth={18} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-black text-white">{Math.round(results.risk_score)}</div>
                      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 text-center lg:text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Risk Level</p>
                    <div className={`inline-flex items-center px-8 py-4 rounded-2xl text-2xl font-bold shadow-lg border-2 transition-all ${
                      results.risk_level === "Low" 
                        ? "bg-green-500 text-white border-green-600 shadow-green-200 dark:shadow-green-900" 
                        : results.risk_level === "Medium"
                        ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-200 dark:shadow-yellow-900"
                        : "bg-red-500 text-white border-red-600 shadow-red-200 dark:shadow-red-900"
                    }`}>
                      {results.risk_level} Risk
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    <p className="leading-relaxed">This assessment is based on comprehensive analysis of retinal imaging, vital signs, and cardiovascular markers.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Results */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">Clinical Measurements</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border border-blue-100 dark:border-blue-900 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">CIMT Value</span>
                    <Badge className="bg-indigo-500 text-white rounded-lg px-4 py-1.5 text-sm font-bold shadow-md">{results.cimt_value.toFixed(3)} mm</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border border-purple-100 dark:border-purple-900 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">ePWV</span>
                    <Badge className="bg-purple-500 text-white rounded-lg px-4 py-1.5 text-sm font-bold shadow-md">{results.epwv_value.toFixed(2)} m/s</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 rounded-xl border border-cyan-100 dark:border-cyan-900 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Retinal Occlusion</span>
                    <Badge className="bg-cyan-500 text-white rounded-lg px-4 py-1.5 text-sm font-bold shadow-md">{(results.retinal_occlusion_prob * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950 rounded-xl border border-teal-100 dark:border-teal-900 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Eye Risk Score</span>
                    <Badge className="bg-teal-500 text-white rounded-lg px-4 py-1.5 text-sm font-bold shadow-md">{(results.eye_risk * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-xl border border-orange-100 dark:border-orange-900 hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Brain Risk Score</span>
                    <Badge className="bg-orange-500 text-white rounded-lg px-4 py-1.5 text-sm font-bold shadow-md">{(results.brain_risk * 100).toFixed(1)}%</Badge>
                  </div>
                </div>
                
                <Separator className="my-5" />
                
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-sky-100 uppercase tracking-wider">Patient Vitals</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border border-blue-100 dark:border-blue-900">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Age</span>
                      <span className="font-bold text-lg text-white">{patientData.age} <span className="text-xs font-normal">years</span></span>
                    </div>
                    <div className="flex flex-col p-3 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 rounded-xl border border-red-100 dark:border-red-900">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Blood Pressure</span>
                      <span className="font-bold text-lg text-white">{patientData.systolicBP}/{patientData.diastolicBP} <span className="text-xs font-normal">mmHg</span></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fundus Image and Recommendations */}
            <div className="space-y-6">
              <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Retinal Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {capturedImage && (
                    <div className="relative group">
                      <img 
                        src={capturedImage} 
                        alt="Retinal fundus" 
                        className="w-full rounded-2xl border-2 border-slate-800 shadow-lg transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Clinical Recommendations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Alert className={
                    results.risk_level === "High" ? "border-2 border-red-300 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 shadow-lg" :
                    results.risk_level === "Medium" ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 shadow-lg" :
                    "border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 shadow-lg"
                  }>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      results.risk_level === "High" ? "bg-red-500" :
                      results.risk_level === "Medium" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`}>
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <AlertDescription className="text-sm leading-relaxed text-slate-200 font-medium">
                      {results.recommendation}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Risk Breakdown Chart */}
          <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-white">Risk Components Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 rounded-xl border border-teal-100 dark:border-teal-900">
                  <div className="flex justify-between mb-3 text-sm">
                    <span className="text-gray-900 dark:text-gray-100 font-bold">Eye Retinal Risk <span className="text-teal-600 dark:text-teal-400">(22% weight)</span></span>
                    <span className="font-bold text-teal-600 dark:text-teal-400 text-lg">{(results.eye_risk * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.eye_risk * 100} className="h-4 bg-teal-100 dark:bg-teal-900" />
                </div>
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <div className="flex justify-between mb-3 text-sm">
                    <span className="text-gray-900 dark:text-gray-100 font-bold">Carotid Risk <span className="text-indigo-600 dark:text-indigo-400">(35% weight)</span></span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{(results.cimt_value * 10).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.cimt_value * 10} className="h-4 bg-indigo-100 dark:bg-indigo-900" />
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-xl border border-orange-100 dark:border-orange-900">
                  <div className="flex justify-between mb-3 text-sm">
                    <span className="text-gray-900 dark:text-gray-100 font-bold">Brain Risk <span className="text-orange-600 dark:text-orange-400">(10% weight)</span></span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">{(results.brain_risk * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.brain_risk * 100} className="h-4 bg-orange-100 dark:bg-orange-900" />
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl border border-blue-100 dark:border-blue-900">
                  <div className="flex justify-between mb-3 text-sm">
                    <span className="text-gray-900 dark:text-gray-100 font-bold">Pulse Wave Velocity <span className="text-blue-600 dark:text-blue-400">(33% weight)</span></span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{results.epwv_value.toFixed(1)} m/s</span>
                  </div>
                  <Progress value={Math.min(results.epwv_value * 10, 100)} className="h-4 bg-blue-100 dark:bg-blue-900" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isFormValid = patientData.age && patientData.systolicBP && patientData.diastolicBP && capturedImage;

  // Capture Step (default view)
  return (
    <div className="min-h-screen bg-black pb-12">
      {/* Top Navigation Bar */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep("patient")}
              className="rounded-xl hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Retinal Image Analysis</h1>
              <p className="text-xs text-sky-200">
                Patient: {selectedPatient?.name} • MRN: {selectedPatient?.mrn}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Data Input */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Patient Vitals</CardTitle>
                    <CardDescription className="text-xs text-gray-600 dark:text-gray-400">Enter current vital signs for analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium text-sky-100">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter age"
                    value={patientData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    min="0"
                    max="120"
                    className="h-11 rounded-xl border-slate-700 focus:border-sky-500 focus:border-blue-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="systolicBP" className="text-sm font-medium text-sky-100">Systolic Blood Pressure (mmHg)</Label>
                  <Input
                    id="systolicBP"
                    type="number"
                    placeholder="Enter systolic BP (50-300)"
                    value={patientData.systolicBP}
                    onChange={(e) => handleInputChange("systolicBP", e.target.value)}
                    min="50"
                    max="300"
                    step="1"
                    required
                    className="h-11 rounded-xl border-slate-700 focus:border-sky-500 focus:border-blue-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="diastolicBP" className="text-sm font-medium text-sky-100">Diastolic Blood Pressure (mmHg)</Label>
                  <Input
                    id="diastolicBP"
                    type="number"
                    placeholder="Enter diastolic BP (30-200)"
                    value={patientData.diastolicBP}
                    onChange={(e) => handleInputChange("diastolicBP", e.target.value)}
                    min="30"
                    max="200"
                    step="1"
                    required
                    className="h-11 rounded-xl border-slate-700 focus:border-sky-500 focus:border-blue-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>

                {selectedPatient && (
                  <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-md">
                    <h4 className="text-sm font-bold mb-3 text-white uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      Patient Information
                    </h4>
                    <div className="text-sm space-y-2.5">
                      <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-bold text-white">{selectedPatient.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Age:</span>
                        <span className="font-bold text-white">{getAge(selectedPatient)} years</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">Gender:</span>
                        <span className="font-bold text-white">{selectedPatient.gender || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <span className="font-semibold text-gray-600 dark:text-gray-400">MRN:</span>
                        <span className="font-bold text-white">{selectedPatient.mrn}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Image Upload */}
          <div>
            <Card className="h-full bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Retinal Image</CardTitle>
                    <CardDescription className="text-xs text-gray-600 dark:text-gray-400">Upload a high-quality fundus photograph</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  {/* Upload Area */}
                  <div
                    className="aspect-square bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950 rounded-2xl flex items-center justify-center relative overflow-hidden border-3 border-dashed border-blue-300 dark:border-blue-700 cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900 dark:hover:to-cyan-950 transition-all duration-300 shadow-inner"
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
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-lg">
                          <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 mb-2 font-bold text-lg">
                          Upload Fundus Image
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Click or drag to upload
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50 rounded-lg px-4 py-2 inline-block">
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

                  {/* Controls */}
                  <div className="flex justify-center gap-4 mt-4">
                    {capturedImage && (
                      <Button onClick={handleRetake} variant="outline" className="rounded-xl border-gray-300 hover:bg-slate-800">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Change Image
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Analyze Button */}
        <div className="flex justify-center mt-10">
          <Button 
            onClick={calculateRiskScore}
            disabled={!isFormValid || isCalculating}
            size="lg"
            className="w-full md:w-auto px-16 py-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Analyzing Image...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Stroke Risk
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};