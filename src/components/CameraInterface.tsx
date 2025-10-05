import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { ArrowLeft, RotateCcw, CheckCircle, AlertTriangle, Upload, Heart, Calculator, Mail, Printer, User } from "lucide-react";

interface CameraInterfaceProps {
  onBack: () => void;
}

export const CameraInterface = ({ onBack }: CameraInterfaceProps) => {
  const [patientData, setPatientData] = useState({
    age: "",
    systolicBP: "",
    diastolicBP: ""
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<"Low" | "Medium" | "High" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


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

  const calculateRiskScore = async () => {
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

    // Debug logging
    console.log("Input values:", {
      age: patientData.age,
      systolicBP: patientData.systolicBP,
      diastolicBP: patientData.diastolicBP
    });
    console.log("Parsed values:", {
      age,
      systolicBP,
      diastolicBP
    });

    if (isNaN(age) || isNaN(systolicBP) || isNaN(diastolicBP)) {
      setError("Please enter valid numeric values");
      return;
    }

    if (age < 0 || age > 120) {
      setError("Please enter a valid age (0-120)");
      return;
    }

    // More specific blood pressure validation with better error messages
    if (systolicBP < 50 || systolicBP > 300) {
      setError(`Systolic blood pressure must be between 50-300 mmHg. You entered: ${systolicBP}`);
      return;
    }

    if (diastolicBP < 30 || diastolicBP > 200) {
      setError(`Diastolic blood pressure must be between 30-200 mmHg. You entered: ${diastolicBP}`);
      return;
    }

    // Additional validation: diastolic should be less than systolic
    if (diastolicBP >= systolicBP) {
      setError("Diastolic blood pressure must be less than systolic blood pressure");
      return;
    }

    // Validate that both values are positive integers (no decimals for BP)
    if (systolicBP % 1 !== 0 || diastolicBP % 1 !== 0) {
      setError("Blood pressure values should be whole numbers (no decimals)");
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
        setRiskScore(result.risk_score / 100); // Convert percentage back to 0-1 scale
        setRiskLevel(result.risk_level);
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

  const isFormValid = patientData.age && patientData.systolicBP && patientData.diastolicBP;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Retinal Image Capture</h1>
            <p className="text-muted-foreground">Capture high-quality retinal images for analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Data Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Patient Information
                </CardTitle>
                <CardDescription>
                  Enter patient details for risk assessment
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
              </CardContent>
            </Card>
          </div>

          {/* Image Upload */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Retinal Image
                </CardTitle>
                <CardDescription>
                  Upload a high-quality retinal image for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Upload Area */}
                  <div
                    className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden border border-dashed"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
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
                        <p className="text-muted-foreground mb-4">
                          Click or drag an image to upload
                        </p>
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Image
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    )}
                    
                    {isCapturing && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                    <Button 
                      onClick={calculateRiskScore}
                      disabled={!isFormValid || isCalculating}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isCalculating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculate Risk Score
                        </>
                      )}
                    </Button>
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

        {/* Risk Score Results */}
        {riskScore !== null && riskLevel && (
          <Card className="overflow-hidden shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">Risk Assessment Result</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="hover:bg-white/50">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:bg-white/50">
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:bg-white/50">
                    <User className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Left Side - Risk Gauge */}
                <div className="flex-shrink-0">
                  <RiskGauge value={riskScore * 100} size={280} strokeWidth={20} />
                </div>
                
                {/* Right Side - Risk Details */}
                <div className="flex-1 space-y-6">
                  {/* Risk Percentage Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        {Math.round(riskScore * 100)}%
                      </div>
                      <div className="text-base text-gray-600 font-medium">
                        Stroke Risk Assessment
                      </div>
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  <div className="flex justify-center">
                    <div className={`inline-flex items-center px-8 py-4 rounded-full text-xl font-semibold shadow-lg ${
                      riskLevel === "Low" 
                        ? "bg-green-100 text-green-800 border-2 border-green-200" 
                        : riskLevel === "Medium"
                        ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-200"
                        : "bg-red-100 text-red-800 border-2 border-red-200"
                    }`}>
                      {riskLevel} Risk
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      Risk Factors Analyzed
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span>Retinal vessel analysis</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span>Brain stroke indicators</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span>Carotid intima-media thickness</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span>Estimated Pulse wave velocity</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning for high risk */}
                  {riskLevel === "High" && (
                    <Alert className="w-full">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High risk detected. Please consult with a healthcare professional immediately.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};