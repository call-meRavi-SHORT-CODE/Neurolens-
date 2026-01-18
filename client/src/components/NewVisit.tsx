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
import { ArrowLeft, ArrowRight, Calculator, Heart, Activity, User, CheckCircle2, Stethoscope, ClipboardList, Upload, RotateCcw, AlertTriangle, Download, FileText, TrendingUp, Camera, Loader2 } from "lucide-react";
import { EpwvCalculator } from "./EpwvCalculator";
import { PatientSearch } from "./PatientSearch";
import { Patient, createVisit, getDiseasesList, formatDiseases } from "@/lib/database";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { Client } from "@gradio/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jsPDF from "jspdf";

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
  const [clinicalRecommendations, setClinicalRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

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

  // Gemini API for clinical recommendations
  const generateClinicalRecommendations = async () => {
    if (!strokeResults || !selectedPatient) return;

    try {
      setIsLoadingRecommendations(true);
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a medical AI assistant helping clinicians with stroke risk assessment. Based on the following patient data and stroke risk analysis results, provide exactly 3 specific, actionable clinical recommendations.

Patient Information:
- Name: ${selectedPatient.name}
- Age: ${visitData.age} years
- Gender: ${selectedPatient.gender || "Not specified"}
- Blood Pressure: ${visitData.systolic}/${visitData.diastolic} mmHg
- Medical History: ${selectedDiseases.length > 0 ? selectedDiseases.join(", ") : "None reported"}

Stroke Risk Analysis Results:
- Final Stroke Risk Score: ${strokeResults.risk_score.toFixed(1)}%
- Risk Level: ${strokeResults.risk_level === "Medium" ? "Moderate" : strokeResults.risk_level}
- CIMT Value: ${strokeResults.cimt_value.toFixed(3)} mm
- ePWV (estimated Pulse Wave Velocity): ${strokeResults.epwv_value.toFixed(2)} m/s
- Retinal Occlusion Probability: ${(strokeResults.retinal_occlusion_prob * 100).toFixed(1)}%

Please provide exactly 3 clinical recommendations in the following JSON format:
{
  "recommendations": [
    "First recommendation here",
    "Second recommendation here", 
    "Third recommendation here"
  ]
}

Each recommendation should be:
1. Specific and actionable
2. Based on the risk level and clinical measurements
3. Appropriate for a clinical setting
4. Between 1-2 sentences each`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          setClinicalRecommendations(parsed.recommendations.slice(0, 3));
        }
      } else {
        // Fallback: try to extract recommendations from text
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const recs = lines.slice(0, 3).map(line => line.replace(/^[\d\.\-\*]+\s*/, '').trim());
        setClinicalRecommendations(recs);
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      // Fallback recommendations based on risk level
      const fallbackRecs = strokeResults.risk_level === "High" 
        ? [
            "Urgent referral to a neurologist or stroke specialist for comprehensive evaluation.",
            "Immediate lifestyle modifications including smoking cessation, dietary changes, and regular physical activity.",
            "Consider initiating or optimizing antihypertensive and lipid-lowering therapy as per clinical guidelines."
          ]
        : strokeResults.risk_level === "Medium"
        ? [
            "Schedule follow-up appointment within 3-6 months for repeat risk assessment.",
            "Encourage lifestyle modifications including regular exercise and heart-healthy diet.",
            "Monitor blood pressure regularly and consider medication adjustment if needed."
          ]
        : [
            "Continue current healthy lifestyle practices and regular health check-ups.",
            "Maintain blood pressure within normal range through diet and exercise.",
            "Annual follow-up recommended for continued stroke risk monitoring."
          ];
      setClinicalRecommendations(fallbackRecs);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!strokeResults || !selectedPatient) return;

    try {
      setIsGeneratingPDF(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7) => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      // Header
      pdf.setFillColor(30, 41, 59); // slate-800
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NeuroLens', margin, 20);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Stroke Risk Assessment Report', margin, 30);
      
      // Date on right side
      pdf.setFontSize(10);
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(currentDate, pageWidth - margin - pdf.getTextWidth(currentDate), 30);

      yPos = 55;
      pdf.setTextColor(0, 0, 0);

      // Patient Information Section
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 35, 'F');
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Patient Information', margin + 5, yPos + 5);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      yPos += 15;
      pdf.text(`Name: ${selectedPatient.name}`, margin + 5, yPos);
      pdf.text(`Age: ${visitData.age} years`, margin + 80, yPos);
      pdf.text(`Gender: ${selectedPatient.gender || 'Not specified'}`, margin + 130, yPos);
      yPos += 8;
      pdf.text(`Blood Pressure: ${visitData.systolic}/${visitData.diastolic} mmHg`, margin + 5, yPos);
      pdf.text(`Mean BP: ${getMeanBP() || 'N/A'} mmHg`, margin + 80, yPos);
      yPos += 20;

      // Risk Assessment Section
      pdf.setFillColor(strokeResults.risk_level === "High" ? 254 : strokeResults.risk_level === "Medium" ? 254 : 220, 
                       strokeResults.risk_level === "High" ? 226 : strokeResults.risk_level === "Medium" ? 249 : 252,
                       strokeResults.risk_level === "High" ? 226 : strokeResults.risk_level === "Medium" ? 195 : 231);
      pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 30, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Risk Assessment Summary', margin + 5, yPos + 5);
      
      pdf.setFontSize(20);
      const riskText = `${strokeResults.risk_score.toFixed(1)}% - ${strokeResults.risk_level === "Medium" ? "Moderate" : strokeResults.risk_level} Risk`;
      pdf.setTextColor(strokeResults.risk_level === "High" ? 220 : strokeResults.risk_level === "Medium" ? 180 : 34,
                       strokeResults.risk_level === "High" ? 38 : strokeResults.risk_level === "Medium" ? 130 : 197,
                       strokeResults.risk_level === "High" ? 38 : strokeResults.risk_level === "Medium" ? 0 : 94);
      pdf.text(riskText, margin + 5, yPos + 20);
      pdf.setTextColor(0, 0, 0);
      yPos += 40;

      // Clinical Measurements
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Clinical Measurements', margin, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const measurements = [
        { label: 'CIMT Value', value: `${strokeResults.cimt_value.toFixed(3)} mm` },
        { label: 'ePWV (Pulse Wave Velocity)', value: `${strokeResults.epwv_value.toFixed(2)} m/s` },
        { label: 'Retinal Occlusion Probability', value: `${(strokeResults.retinal_occlusion_prob * 100).toFixed(1)}%` },
        { label: 'Final Stroke Risk Probability', value: `${strokeResults.risk_score.toFixed(1)}%` }
      ];

      measurements.forEach((m, i) => {
        pdf.setFillColor(i % 2 === 0 ? 248 : 241, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 249);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
        pdf.text(m.label, margin + 5, yPos + 2);
        pdf.setFont('helvetica', 'bold');
        pdf.text(m.value, pageWidth - margin - pdf.getTextWidth(m.value) - 5, yPos + 2);
        pdf.setFont('helvetica', 'normal');
        yPos += 10;
      });

      yPos += 10;

      // Medical History
      if (selectedDiseases.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Medical History', margin, yPos);
        yPos += 8;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(selectedDiseases.join(', '), margin + 5, yPos);
        yPos += 15;
      }

      // Clinical Recommendations
      if (clinicalRecommendations.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Clinical Recommendations', margin, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        clinicalRecommendations.forEach((rec, index) => {
          pdf.setFillColor(241, 245, 249);
          const recHeight = Math.ceil(pdf.splitTextToSize(rec, pageWidth - 2 * margin - 20).length * 5) + 6;
          pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, recHeight, 'F');
          pdf.text(`${index + 1}.`, margin + 5, yPos + 2);
          yPos = addWrappedText(rec, margin + 15, yPos + 2, pageWidth - 2 * margin - 25, 5);
          yPos += 5;
        });
      }

      // Add fundus image if available
      if (capturedImage) {
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Fundus Image', margin, yPos + 10);
        yPos += 15;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = capturedImage;
          });

          const imgWidth = 80;
          const imgHeight = (img.height / img.width) * imgWidth;
          pdf.addImage(img, 'JPEG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch (imgError) {
          console.error('Error adding image to PDF:', imgError);
          pdf.setFontSize(10);
          pdf.text('Fundus image could not be embedded', margin, yPos + 5);
        }
      }

      // Footer
      const footerY = pageHeight - 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('This report is generated by NeuroLens AI-powered stroke risk assessment system.', margin, footerY);
      pdf.text('For clinical use only. Please consult with a healthcare professional.', margin, footerY + 4);

      // Save the PDF
      const fileName = `NeuroLens_Report_${selectedPatient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Report Downloaded",
        description: `PDF report saved as ${fileName}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Auto-generate recommendations when stroke results are available
  useEffect(() => {
    if (strokeResults && currentStep === 5 && clinicalRecommendations.length === 0) {
      generateClinicalRecommendations();
    }
  }, [strokeResults, currentStep]);

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
      
      // Fetch the image and convert to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Connect to Gradio API
      const client = await Client.connect("Ravikrishna-25/neurolens-O");
      const result = await client.predict("/gradio_predict", { 
        image: blob, 
        age: parseInt(visitData.age), 
        systolic_bp: parseInt(visitData.systolic), 
        diastolic_bp: parseInt(visitData.diastolic), 
      });

      // Parse the result - Gradio returns data in result.data array
      const data = result.data as any;
      
      // The API returns a JSON object with the prediction results
      const predictionResult = typeof data[0] === 'string' ? JSON.parse(data[0]) : data[0];
      
      // Map the Gradio response to our StrokeRiskResults interface
      // Note: Backend returns "risk_score_%" as the key
      const strokeResult: StrokeRiskResults = {
        success: true,
        risk_score: predictionResult["risk_score_%"] ?? predictionResult.risk_score ?? predictionResult.combined_risk_score ?? 0,
        risk_level: predictionResult.risk_level ?? (predictionResult["risk_score_%"] > 60 ? "High" : predictionResult["risk_score_%"] > 30 ? "Medium" : "Low"),
        cimt_value: predictionResult.cimt_value ?? predictionResult.cimt ?? 0,
        epwv_value: predictionResult.epwv_value ?? predictionResult.epwv ?? 0,
        retinal_occlusion_prob: predictionResult.retinal_occlusion_prob ?? predictionResult.retinal_occlusion ?? 0,
        eye_risk: predictionResult.eye_risk ?? predictionResult.eye_stroke_risk ?? 0,
        brain_risk: predictionResult.brain_risk ?? predictionResult.brain_stroke_risk ?? 0,
        recommendation: predictionResult.recommendation ?? predictionResult.recommendations ?? ""
      };
      
      setStrokeResults(strokeResult);
      setCurrentStep(5); // Move to results step
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
        
        // Calculate arrow position percentage
        const arrowPosition = Math.min(Math.max(strokeResults.risk_score, 0), 100);
        
        return (
          <div className="space-y-6" ref={reportRef}>
            {/* Risk Category Card */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Stroke Risk Assessment</CardTitle>
                  </div>
                  {/* Download Report Button */}
                  <Button
                    onClick={generatePDFReport}
                    disabled={isGeneratingPDF}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Risk Category Display */}
                <div className="text-center mb-8">
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Risk Category</p>
                  <div className={`inline-flex items-center px-10 py-5 rounded-2xl text-3xl font-bold shadow-lg border-2 transition-all ${
                    strokeResults.risk_level === "Low" 
                      ? "bg-green-500 text-white border-green-600 shadow-green-900/50" 
                      : strokeResults.risk_level === "Medium"
                      ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-900/50"
                      : "bg-red-500 text-white border-red-600 shadow-red-900/50"
                  }`}>
                    {strokeResults.risk_level === "Medium" ? "Moderate" : strokeResults.risk_level} Risk
                  </div>
                </div>

                {/* Risk Bar/Gauge with Arrow */}
                <div className="mb-8 px-4">
                  {/* Arrow indicator above the bar */}
                  <div className="relative h-10 mb-1">
                    <div 
                      className="absolute transition-all duration-700 ease-out flex flex-col items-center"
                      style={{ left: `${arrowPosition}%`, transform: 'translateX(-50%)' }}
                    >
                      {/* Score label */}
                      <span className={`text-sm font-bold mb-1 ${
                        arrowPosition < 33 ? 'text-green-400' : arrowPosition < 66 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {strokeResults.risk_score.toFixed(1)}%
                      </span>
                      {/* Down arrow */}
                      <svg width="20" height="12" viewBox="0 0 20 12" className={`${
                        arrowPosition < 33 ? 'fill-green-400' : arrowPosition < 66 ? 'fill-yellow-400' : 'fill-red-400'
                      }`}>
                        <path d="M10 12L0 0h20L10 12z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Gradient bar */}
                  <div className="relative h-8 rounded-full overflow-hidden shadow-lg" style={{
                    background: 'linear-gradient(to right, #22c55e 0%, #22c55e 30%, #eab308 50%, #ef4444 70%, #ef4444 100%)'
                  }}>
                    {/* Indicator line */}
                    <div 
                      className="absolute top-0 h-full w-1 bg-white shadow-xl transition-all duration-700 ease-out"
                      style={{ left: `calc(${arrowPosition}% - 2px)` }}
                    />
                  </div>
                  
                  {/* Labels below bar */}
                  <div className="flex justify-between mt-3 text-sm font-semibold px-2">
                    <span className="text-green-400">Low (0-30%)</span>
                    <span className="text-yellow-400">Moderate (30-60%)</span>
                    <span className="text-red-400">High (60-100%)</span>
                  </div>
                </div>

                {/* Final Stroke Risk Probability */}
                <div className="text-center p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30">
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Final Stroke Risk Probability</p>
                  <p className="text-5xl font-black text-white">{strokeResults.risk_score.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results & Fundus Image */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detailed Results */}
              <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 p-5">
                  <CardTitle className="text-xl font-bold text-white">Detailed Results</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 flex justify-between items-center">
                      <p className="text-sm text-slate-400">CIMT Value</p>
                      <p className="text-xl font-bold text-white">{strokeResults.cimt_value.toFixed(3)} mm</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 flex justify-between items-center">
                      <p className="text-sm text-slate-400">ePWV</p>
                      <p className="text-xl font-bold text-white">{strokeResults.epwv_value.toFixed(2)} m/s</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 flex justify-between items-center">
                      <p className="text-sm text-slate-400">Retinal Occlusion Probability</p>
                      <p className="text-xl font-bold text-white">{(strokeResults.retinal_occlusion_prob * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-xl border border-indigo-500/20 flex justify-between items-center">
                      <p className="text-sm text-slate-400">Final Stroke Risk Probability</p>
                      <p className="text-xl font-bold text-white">{strokeResults.risk_score.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fundus Image */}
              <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 p-5">
                  <CardTitle className="text-xl font-bold text-white">Fundus Image</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {capturedImage && (
                    <div className="relative rounded-xl overflow-hidden border-2 border-slate-700">
                      <img 
                        src={capturedImage} 
                        alt="Retinal Fundus Image" 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Clinical Recommendations - Gemini AI */}
            <Card className="bg-slate-900 border border-slate-800 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-white">Clinical Recommendations</CardTitle>
                  <Button
                    onClick={generateClinicalRecommendations}
                    disabled={isLoadingRecommendations}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    {isLoadingRecommendations ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingRecommendations ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Generating AI-powered recommendations...</p>
                    </div>
                  </div>
                ) : clinicalRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    {clinicalRecommendations.map((rec, index) => (
                      <Alert 
                        key={index}
                        className={`border-l-4 px-3 py-2 ${
                          strokeResults.risk_level === "High" 
                            ? "border-l-red-500 bg-red-700/90" 
                            : strokeResults.risk_level === "Medium"
                            ? "border-l-yellow-500 bg-yellow-300/90"
                            : "border-l-green-500 bg-green-600/90"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            strokeResults.risk_level === "High" 
                              ? "bg-red-500 text-white" 
                              : strokeResults.risk_level === "Medium"
                              ? "bg-yellow-500 text-slate-900"
                              : "bg-green-500 text-white"
                          }`}>
                            {index + 1}
                          </div>
                          <AlertDescription className={`text-base leading-relaxed font-medium pt-0.5 ${
                            strokeResults.risk_level === "Medium" ? "text-slate-900" : "text-white"
                          }`}>
                            {rec}
                          </AlertDescription>
                        </div>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-400 text-sm">No recommendations available. Click "Regenerate" to get AI-powered recommendations.</p>
                  </div>
                )}
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
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 font-semibold shadow-md px-4"
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