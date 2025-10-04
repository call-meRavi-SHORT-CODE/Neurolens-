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
  const [qualityCheck, setQualityCheck] = useState<{
    blur: "pass" | "fail";
    exposure: "pass" | "fail";
    coverage: "pass" | "fail";
    artifacts: "pass" | "fail";
  } | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState<"Low" | "Medium" | "High" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runQualityCheck = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setQualityCheck({
        blur: Math.random() > 0.3 ? "pass" : "fail",
        exposure: Math.random() > 0.2 ? "pass" : "fail",
        coverage: Math.random() > 0.4 ? "pass" : "fail",
        artifacts: Math.random() > 0.1 ? "pass" : "fail",
      });
      setIsCapturing(false);
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setQualityCheck(null);
    setError(null);
    runQualityCheck();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setQualityCheck(null);
    setError(null);
    runQualityCheck();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setQualityCheck(null);
    setRiskScore(null);
    setRiskLevel(null);
    setError(null);
  };

  const calculateRiskScore = () => {
    // Validate inputs
    if (!patientData.age || !patientData.systolicBP || !patientData.diastolicBP) {
      setError("Please fill in all patient data fields");
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

    if (systolicBP < 50 || systolicBP > 300 || diastolicBP < 30 || diastolicBP > 200) {
      setError("Please enter valid blood pressure values");
      return;
    }

    // Dummy risk score calculation based on patient data
    let baseRisk = 0;
    
    // Age factor
    if (age < 40) baseRisk += 10;
    else if (age < 60) baseRisk += 25;
    else if (age < 80) baseRisk += 45;
    else baseRisk += 65;
    
    // Blood pressure factor
    if (systolicBP > 180 || diastolicBP > 110) baseRisk += 30;
    else if (systolicBP > 160 || diastolicBP > 100) baseRisk += 20;
    else if (systolicBP > 140 || diastolicBP > 90) baseRisk += 10;
    
    // Add some randomness for demo purposes
    const randomFactor = (Math.random() - 0.5) * 20;
    const finalRisk = Math.max(5, Math.min(95, baseRisk + randomFactor));
    
    setRiskScore(finalRisk / 100); // Convert to 0-1 scale
    
    // Determine risk level based on score
    if (finalRisk < 30) {
      setRiskLevel("Low");
    } else if (finalRisk < 60) {
      setRiskLevel("Medium");
    } else if (finalRisk < 80) {
      setRiskLevel("High");
    } else {
      setRiskLevel("High");
    }
    
    setError(null);
  };

  const isQualityGood = qualityCheck && Object.values(qualityCheck).every(check => check === "pass");
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
                    placeholder="Enter systolic BP"
                    value={patientData.systolicBP}
                    onChange={(e) => handleInputChange("systolicBP", e.target.value)}
                    min="50"
                    max="300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="diastolicBP">Diastolic Blood Pressure (mmHg)</Label>
                  <Input
                    id="diastolicBP"
                    type="number"
                    placeholder="Enter diastolic BP"
                    value={patientData.diastolicBP}
                    onChange={(e) => handleInputChange("diastolicBP", e.target.value)}
                    min="30"
                    max="200"
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
                      disabled={!isFormValid}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate Risk Score
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Result</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-8">
                {/* Risk Gauge */}
                <RiskGauge value={riskScore * 100} size={300} strokeWidth={25} />
                
                {/* Risk Details Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm w-full max-w-md">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {Math.round(riskScore * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      10-year risk of CV event
                    </div>
                  </div>
                </div>

                {/* Risk Level Badge */}
                <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-medium ${
                  riskLevel === "Low" 
                    ? "bg-green-100 text-green-800" 
                    : riskLevel === "Medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {riskLevel} Risk
                </div>

                {/* Risk Factors */}
                <div className="w-full max-w-2xl">
                  <h4 className="font-medium text-gray-900 mb-4 text-center">Risk Factors Analyzed:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Retinal vessel analysis
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Carotid intima-media thickness
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Brain stroke indicators
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Pulse wave velocity (age & BP)
                    </div>
                  </div>
                </div>

                {/* Warning for high risk */}
                {riskLevel === "High" && (
                  <Alert className="w-full max-w-2xl">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      High risk detected. Please consult with a healthcare professional immediately.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Check Results */}
        {qualityCheck && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isQualityGood ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                )}
                Image Quality Assessment
              </CardTitle>
              <CardDescription>
                Automated quality checks for optimal analysis results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(qualityCheck).map(([check, status]) => (
                  <div key={check} className="flex items-center gap-2">
                    {status === "pass" ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm capitalize">
                      {check === "artifacts" ? "No Artifacts" : check}
                    </span>
                  </div>
                ))}
              </div>
              
              {!isQualityGood && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Image quality issues detected. Consider retaking the image for optimal analysis results.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};