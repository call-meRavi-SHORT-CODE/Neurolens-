import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface EpwvCalculatorProps {
  age: number;
  mbp: number;
}

interface EpwvResult {
  epwv: number;
  riskCategory: "Low" | "Medium" | "High";
  confidence: "Low" | "Moderate" | "High";
  interpretation: string;
  recommendations: string[];
}

export const EpwvCalculator = ({ age, mbp }: EpwvCalculatorProps) => {
  const [result, setResult] = useState<EpwvResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateEpwv = (age: number, mbp: number): number => {
    // ePWV Formula from the prompt
    const epwv = 0.587
      - (0.402 * age)
      + (4.560 * 0.001 * (age * age))
      - (2.621 * 0.00001 * (age * age) * mbp)
      + (3.176 * 0.001 * age * mbp)
      - (1.832 * 0.01 * mbp);
    
    return Math.max(0, epwv); // Ensure non-negative result
  };

  const getRiskCategory = (epwv: number, age: number): "Low" | "Medium" | "High" => {
    // Risk stratification based on typical ePWV values
    if (epwv < 8) return "Low";
    if (epwv < 12) return "Medium";
    return "High";
  };

  const getConfidence = (age: number, mbp: number): "Low" | "Moderate" | "High" => {
    // Confidence based on input validity ranges
    if (age < 18 || age > 90 || mbp < 60 || mbp > 120) return "Low";
    if (age < 25 || age > 80 || mbp < 70 || mbp > 110) return "Moderate";
    return "High";
  };

  const getInterpretation = (riskCategory: string): string => {
    switch (riskCategory) {
      case "Low":
        return "Normal arterial stiffness — continue routine monitoring.";
      case "Medium":
        return "Elevated arterial stiffness — consider lifestyle modifications and follow-up.";
      case "High":
        return "Significantly elevated arterial stiffness — recommend clinical evaluation.";
      default:
        return "Assessment complete.";
    }
  };

  const getRecommendations = (riskCategory: string): string[] => {
    switch (riskCategory) {
      case "Low":
        return [
          "Continue regular health screenings",
          "Maintain healthy lifestyle habits",
          "Monitor blood pressure regularly"
        ];
      case "Medium":
        return [
          "Lifestyle modifications recommended",
          "Consider dietary consultation",
          "Increase physical activity",
          "Follow-up in 6 months"
        ];
      case "High":
        return [
          "Clinical evaluation recommended",
          "Comprehensive cardiovascular assessment",
          "Consider specialist referral",
          "Immediate lifestyle interventions"
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    if (age > 0 && mbp > 0) {
      setIsCalculating(true);
      
      // Simulate calculation delay for realistic UX
      setTimeout(() => {
        const epwv = calculateEpwv(age, mbp);
        const riskCategory = getRiskCategory(epwv, age);
        const confidence = getConfidence(age, mbp);
        const interpretation = getInterpretation(riskCategory);
        const recommendations = getRecommendations(riskCategory);

        setResult({
          epwv,
          riskCategory,
          confidence,
          interpretation,
          recommendations
        });
        setIsCalculating(false);
      }, 1500);
    }
  }, [age, mbp]);

  if (!age || !mbp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            ePWV Calculator
          </CardTitle>
          <CardDescription>Estimated Pulse Wave Velocity Analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please complete the vital signs (age and blood pressure) to calculate ePWV.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            ePWV Calculator
          </CardTitle>
          <CardDescription>Estimated Pulse Wave Velocity Analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Patient Age</p>
              <p className="text-2xl font-bold">{age} years</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Mean Blood Pressure</p>
              <p className="text-2xl font-bold">{mbp} mmHg</p>
            </div>
          </div>

          {isCalculating && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Calculating ePWV...</span>
              </div>
            </div>
          )}

          {result && !isCalculating && (
            <div className="space-y-6">
              {/* Main Result */}
              <div className="text-center p-6 bg-gradient-to-br from-card to-muted/30 rounded-lg border">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">ePWV Result</span>
                </div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {result.epwv.toFixed(2)} m/s
                </div>
                <Badge 
                  variant={result.riskCategory === "High" ? "destructive" : result.riskCategory === "Medium" ? "default" : "secondary"}
                  className={`text-sm ${result.riskCategory === "Medium" ? "bg-warning text-warning-foreground" : ""}`}
                >
                  {result.riskCategory} Risk
                </Badge>
              </div>

              {/* Interpretation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Clinical Interpretation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    {result.riskCategory === "Low" ? (
                      <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    ) : (
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${result.riskCategory === "High" ? "text-destructive" : "text-warning"}`} />
                    )}
                    <div>
                      <p className="font-medium mb-2">{result.interpretation}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Confidence Level:</span>
                        <Badge variant="outline" className={
                          result.confidence === "High" ? "border-success text-success" :
                          result.confidence === "Moderate" ? "border-warning text-warning" :
                          "border-muted-foreground text-muted-foreground"
                        }>
                          {result.confidence}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Clinical Note:</strong> This is an AI-assisted calculation. Clinical interpretation and patient management decisions should always be confirmed by a qualified healthcare professional.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};