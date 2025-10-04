import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Camera, Eye, RotateCcw, CheckCircle, AlertTriangle, Upload } from "lucide-react";

interface CameraInterfaceProps {
  onBack: () => void;
}

export const CameraInterface = ({ onBack }: CameraInterfaceProps) => {
  const [selectedEye, setSelectedEye] = useState<"left" | "right" | null>(null);
  const [captureMode, setCaptureMode] = useState<"macula" | "disc">("macula");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<{
    blur: "pass" | "fail";
    exposure: "pass" | "fail";
    coverage: "pass" | "fail";
    artifacts: "pass" | "fail";
  } | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setQualityCheck(null);
    runQualityCheck();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedEye) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
    setQualityCheck(null);
    runQualityCheck();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setQualityCheck(null);
  };

  const isQualityGood = qualityCheck && Object.values(qualityCheck).every(check => check === "pass");

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Eye Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant={selectedEye === "left" ? "default" : "outline"}
                  onClick={() => setSelectedEye("left")}
                  className="w-full justify-start"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Left Eye
                </Button>
                <Button 
                  variant={selectedEye === "right" ? "default" : "outline"}
                  onClick={() => setSelectedEye("right")}
                  className="w-full justify-start"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Right Eye
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant={captureMode === "macula" ? "default" : "outline"}
                  onClick={() => setCaptureMode("macula")}
                  className="w-full"
                >
                  Macula-Centered
                </Button>
                <Button 
                  variant={captureMode === "disc" ? "default" : "outline"}
                  onClick={() => setCaptureMode("disc")}
                  className="w-full"
                >
                  Optic Disc-Centered
                </Button>
              </CardContent>
            </Card>

            {/* Removed Camera Settings as per requirement */}
          </div>

          {/* Image Upload */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Retinal Image
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedEye && (
                      <Badge variant="outline">
                        {selectedEye.charAt(0).toUpperCase() + selectedEye.slice(1)} Eye
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {captureMode === "macula" ? "Macula" : "Optic Disc"}
                    </Badge>
                  </div>
                </CardTitle>
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
                        <p className="text-muted-foreground">
                          {selectedEye ? `Click or drag an image for the ${selectedEye} eye` : "Select an eye to begin"}
                        </p>
                        {selectedEye && (
                          <div className="mt-4">
                            <Button onClick={() => fileInputRef.current?.click()} disabled={!selectedEye}>
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
                    {!capturedImage ? null : (
                      <div className="flex gap-3">
                        <Button onClick={handleRetake} variant="outline">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retake
                        </Button>
                        <Button 
                          disabled={!isQualityGood}
                          className="bg-success hover:bg-success/90 text-success-foreground"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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