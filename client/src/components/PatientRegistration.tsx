import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, User, Activity, CheckCircle2, Calendar, Phone, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createPatient, Patient } from "@/lib/database";
import gsap from "gsap";

interface PatientRegistrationProps {
  onBack: () => void;
  onPatientCreated?: (patient: Patient) => void;
}

export const PatientRegistration = ({ onBack, onPatientCreated }: PatientRegistrationProps) => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    mrn: `MRN${Date.now()}`, // Auto-generated
    phone: "",
    address: "",
    // Medical History
    highBloodPressure: "",
    diabetes: "",
    previousStroke: "",
    heartDisease: "",
    smokingAlcohol: ""
  });

  // Refs for GSAP animations
  const headerRef = useRef(null);
  const formRef = useRef(null);
  const summaryRef = useRef(null);

  // GSAP Animation on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );

      gsap.fromTo(formRef.current,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.7, delay: 0.2, ease: "power3.out" }
      );

      gsap.fromTo(summaryRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.7, delay: 0.3, ease: "power3.out" }
      );
    });

    return () => ctx.revert();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.age || !formData.gender) {
      toast({
        title: "Validation Error",
        description: "Name, Age, and Gender are required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate age range
    if (parseInt(formData.age) < 0 || parseInt(formData.age) > 150) {
      toast({
        title: "Validation Error",
        description: "Age must be between 0 and 150 years.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Compile medical history into notes
      const medicalHistory = [
        formData.highBloodPressure === "yes" ? "History of high blood pressure" : null,
        formData.diabetes === "yes" ? "History of diabetes" : null,
        formData.previousStroke === "yes" ? "Previous stroke or TIA" : null,
        formData.heartDisease === "yes" ? "Known heart disease" : null,
        formData.smokingAlcohol === "yes" ? "Smoking or alcohol use" : null,
      ].filter(Boolean).join("; ");

      // Prepare patient data
      const patientData = {
        name: formData.name,
        dob: null,
        age: parseInt(formData.age),
        gender: formData.gender,
        mrn: formData.mrn,
        phone: formData.phone || null,
        address: formData.address || null,
        height: null,
        weight: null,
        bmi: null,
        blood_group: null,
        physician: null,
        allergies: null,
        notes: medicalHistory || null
      };

      // Save to database
      const newPatient = await createPatient(patientData);

      toast({
        title: "Patient Registered",
        description: `${formData.name} has been successfully registered.`,
        variant: "default"
      });
      
      // If callback provided, pass the new patient back (for visit flow)
      if (onPatientCreated && newPatient) {
        onPatientCreated(newPatient);
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register patient. Please try again.",
        variant: "destructive"
      });
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Top Navigation Bar */}
      <div className="bg-[#0f1419] border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div ref={headerRef} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">NeuroLens <span className="text-slate-400 font-normal">Pro</span></h1>
                  <p className="text-xs text-slate-400">New Patient Registration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div ref={formRef} className="lg:col-span-2 space-y-6">
            <Card className="bg-[#0f1419] border border-slate-800/50">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-white">Patient Basic Details</CardTitle>
                    <CardDescription className="text-xs text-slate-400 uppercase tracking-wide">Required Information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-medium text-slate-300">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter patient's full name"
                      className="h-10 bg-[#1a1f2e] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-xs font-medium text-slate-300">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Enter age"
                      className="h-10 bg-[#1a1f2e] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs font-medium text-slate-300">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger className="h-10 bg-[#1a1f2e] border-slate-700/50 text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20">
                        <SelectValue placeholder="Select gender" className="text-slate-500" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-slate-700">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-medium text-slate-300">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="h-10 pl-10 bg-[#1a1f2e] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn" className="text-xs font-medium text-slate-300">Patient ID</Label>
                    <div className="relative">
                      <Input
                        id="mrn"
                        value={formData.mrn}
                        disabled
                        className="h-10 bg-[#1a1f2e]/50 border-slate-700/30 text-slate-400 pr-10"
                      />
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Auto-generated</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitDate" className="text-xs font-medium text-slate-300">Date of Visit</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="visitDate"
                        value={currentDate}
                        disabled
                        className="h-10 pl-10 bg-[#1a1f2e]/50 border-slate-700/30 text-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Auto-filled</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-medium text-slate-300">Address <span className="text-slate-500">(Optional)</span></Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter patient address"
                    rows={2}
                    className="bg-[#1a1f2e] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card className="bg-[#0f1419] border border-slate-800/50">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-white">Medical History</CardTitle>
                    <CardDescription className="text-xs text-slate-400 uppercase tracking-wide">Answer the following yes/no questions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">1. History of high blood pressure?</Label>
                  <RadioGroup value={formData.highBloodPressure} onValueChange={(value) => setFormData({ ...formData, highBloodPressure: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <RadioGroupItem value="yes" id="bp-yes" className="border-slate-600 text-sky-500" />
                        <Label htmlFor="bp-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <Button
                        type="button"
                        variant={formData.highBloodPressure === "no" ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, highBloodPressure: "no" })}
                        className={`rounded-full px-6 h-9 ${
                          formData.highBloodPressure === "no" 
                            ? "bg-sky-500 hover:bg-sky-600 text-white" 
                            : "bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800/50"
                        }`}
                      >
                        No
                      </Button>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">2. History of diabetes?</Label>
                  <RadioGroup value={formData.diabetes} onValueChange={(value) => setFormData({ ...formData, diabetes: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <RadioGroupItem value="yes" id="diabetes-yes" className="border-slate-600 text-sky-500" />
                        <Label htmlFor="diabetes-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <Button
                        type="button"
                        variant={formData.diabetes === "no" ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, diabetes: "no" })}
                        className={`rounded-full px-6 h-9 ${
                          formData.diabetes === "no" 
                            ? "bg-sky-500 hover:bg-sky-600 text-white" 
                            : "bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800/50"
                        }`}
                      >
                        No
                      </Button>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">3. Any previous stroke or TIA?</Label>
                  <RadioGroup value={formData.previousStroke} onValueChange={(value) => setFormData({ ...formData, previousStroke: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <RadioGroupItem value="yes" id="stroke-yes" className="border-slate-600 text-sky-500" />
                        <Label htmlFor="stroke-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <Button
                        type="button"
                        variant={formData.previousStroke === "no" ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, previousStroke: "no" })}
                        className={`rounded-full px-6 h-9 ${
                          formData.previousStroke === "no" 
                            ? "bg-sky-500 hover:bg-sky-600 text-white" 
                            : "bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800/50"
                        }`}
                      >
                        No
                      </Button>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div ref={summaryRef} className="space-y-4">
            <Card className="bg-[#1a2332] border border-slate-800/50 sticky top-6">
              <CardHeader className="bg-sky-400 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-base font-semibold text-white">Patient Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Name:</span>
                    <span className="font-medium text-sm text-slate-400 italic">{formData.name || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Age:</span>
                    <span className="font-medium text-sm text-slate-400 italic">{formData.age || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Gender:</span>
                    <span className="font-medium text-sm text-slate-400 italic">{formData.gender || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Phone:</span>
                    <span className="font-medium text-sm text-slate-400 italic">{formData.phone || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-slate-400">Patient ID:</span>
                    <span className="font-mono text-sm text-sky-400">{formData.mrn}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Visit Date:</span>
                    <span className="font-medium text-sm text-white">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={handleSave} 
                    className="w-full h-11 bg-sky-400 hover:bg-sky-500 text-white font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Patient
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={onBack}
                    className="w-full h-11 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tip - Separate Card */}
            <Card className="bg-[#1a2332] border border-sky-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm text-white font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Quick Tip</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ensure all mandatory fields marked with an asterisk (*) are filled correctly to proceed with patient registration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};