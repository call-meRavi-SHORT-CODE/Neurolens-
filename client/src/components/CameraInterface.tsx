import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    setRiskScore(null);
    setRiskLevel(null);
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Stroke Risk Analysis</h1>
              <p className="text-muted-foreground">Select a patient to begin analysis</p>
            </div>
          </div>
          
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setCurrentStep("capture")} className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Stroke Risk Analysis Results</h1>
                <p className="text-muted-foreground">{selectedPatient.name} • {getAge(selectedPatient)}y • {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <Button onClick={downloadPDFReport} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF Report
            </Button>
          </div>

          {/* Risk Category Card */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-2xl">Risk Category</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-8">
                <RiskGauge value={results.risk_score} size={200} strokeWidth={16} />
                <div className="space-y-4">
                  <div>
                    <div className="text-6xl font-bold text-gray-900">{Math.round(results.risk_score)}%</div>
                    <p className="text-lg text-muted-foreground mt-2">Final Stroke Risk Score</p>
                  </div>
                  <div className={`inline-flex items-center px-6 py-3 rounded-full text-xl font-semibold ${
                    results.risk_level === "Low" 
                      ? "bg-green-100 text-green-800 border-2 border-green-200" 
                      : results.risk_level === "Medium"
                      ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-200"
                      : "bg-red-100 text-red-800 border-2 border-red-200"
                  }`}>
                    {results.risk_level} Risk
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Detailed Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">CIMT Value</span>
                    <Badge variant="outline">{results.cimt_value.toFixed(3)} mm</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">ePWV</span>
                    <Badge variant="outline">{results.epwv_value.toFixed(2)} m/s</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">Retinal Occlusion Probability</span>
                    <Badge variant="outline">{(results.retinal_occlusion_prob * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">Eye Risk Score</span>
                    <Badge variant="outline">{(results.eye_risk * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">Brain Risk Score</span>
                    <Badge variant="outline">{(results.brain_risk * 100).toFixed(1)}%</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Patient Vitals</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>Age:</span>
                      <span className="font-medium">{patientData.age} years</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>BP:</span>
                      <span className="font-medium">{patientData.systolicBP}/{patientData.diastolicBP} mmHg</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fundus Image and Recommendations */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fundus Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {capturedImage && (
                    <img 
                      src={capturedImage} 
                      alt="Retinal fundus" 
                      className="w-full rounded-lg border"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className={
                    results.risk_level === "High" ? "border-red-200 bg-red-50" :
                    results.risk_level === "Medium" ? "border-yellow-200 bg-yellow-50" :
                    "border-green-200 bg-green-50"
                  }>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {results.recommendation}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Risk Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Risk Components Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Eye Retinal Risk (22%)</span>
                    <span className="font-medium">{(results.eye_risk * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.eye_risk * 100} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Carotid Risk (35%)</span>
                    <span className="font-medium">{(results.cimt_value * 10).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.cimt_value * 10} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Brain Risk (10%)</span>
                    <span className="font-medium">{(results.brain_risk * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={results.brain_risk * 100} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Pulse Wave Velocity (33%)</span>
                    <span className="font-medium">{results.epwv_value.toFixed(1)} m/s</span>
                  </div>
                  <Progress value={Math.min(results.epwv_value * 10, 100)} className="h-3" />
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setCurrentStep("patient")} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Retinal Image Analysis</h1>
            <p className="text-muted-foreground">
              Patient: {selectedPatient?.name} • MRN: {selectedPatient?.mrn}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Data Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Patient Vitals
                </CardTitle>
                <CardDescription>
                  Enter current vital signs for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter age"
                    value={patientData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    min="0"
                    max="120"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="systolicBP">Systolic Blood Pressure (mmHg)</Label>
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
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="diastolicBP">Diastolic Blood Pressure (mmHg)</Label>
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
                  />
                </div>

                {selectedPatient && (
                  <div className="mt-4 p-3 bg-accent/10 rounded-lg border">
                    <h4 className="text-sm font-semibold mb-2">Patient Information</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>Name: {selectedPatient.name}</p>
                      <p>Age: {getAge(selectedPatient)} years</p>
                      <p>Gender: {selectedPatient.gender || "Not specified"}</p>
                      <p>MRN: {selectedPatient.mrn}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Image Upload */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Fundus Image
                </CardTitle>
                <CardDescription>
                  Upload a high-quality retinal fundus image
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Upload Area */}
                  <div
                    className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-dashed cursor-pointer hover:bg-accent/5 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => !capturedImage && fileInputRef.current?.click()}
                  >
                    {capturedImage ? (
                      <img 
                        src={capturedImage} 
                        alt="Captured retinal image" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-2 font-medium">
                          Click or drag an image to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports JPG, PNG formats
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
                      <Button onClick={handleRetake} variant="outline">
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
        <div className="flex justify-center">
          <Button 
            onClick={calculateRiskScore}
            disabled={!isFormValid || isCalculating}
            size="lg"
            className="w-full md:w-auto px-12"
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