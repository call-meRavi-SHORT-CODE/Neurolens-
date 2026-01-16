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
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div ref={headerRef} className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={onBack} 
              className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">New Patient Registration</h1>
              <p className="text-sm text-slate-400">Register a new patient in the system</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div ref={formRef} className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border border-slate-800 shadow-lg hover:shadow-cyan-500/10 transition-shadow rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Patient Basic Details</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Required patient information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-300">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter patient's full name"
                      className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-sm font-medium text-slate-300">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Enter age"
                      className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium text-slate-300">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20">
                        <SelectValue placeholder="Select gender" className="text-slate-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="h-11 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn" className="text-sm font-medium text-slate-300">Patient ID</Label>
                    <div className="relative">
                      <Input
                        id="mrn"
                        value={formData.mrn}
                        disabled
                        className="h-11 rounded-xl bg-slate-700 border-slate-600 text-slate-300"
                      />
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-slate-400">Auto-generated</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitDate" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Visit
                    </Label>
                    <Input
                      id="visitDate"
                      value={currentDate}
                      disabled
                      className="h-11 rounded-xl bg-slate-700 border-slate-600 text-slate-300"
                    />
                    <p className="text-xs text-slate-400">Auto-filled</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address (optional)
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter patient address"
                    rows={2}
                    className="rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card className="bg-slate-900 border border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Medical History</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Answer the following yes/no questions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">1. History of high blood pressure?</Label>
                  <RadioGroup value={formData.highBloodPressure} onValueChange={(value) => setFormData({ ...formData, highBloodPressure: value })}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="yes" id="bp-yes" className="border-slate-600" />
                        <Label htmlFor="bp-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="no" id="bp-no" className="border-slate-600" />
                        <Label htmlFor="bp-no" className="font-normal cursor-pointer text-slate-300">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">2. History of diabetes?</Label>
                  <RadioGroup value={formData.diabetes} onValueChange={(value) => setFormData({ ...formData, diabetes: value })}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="yes" id="diabetes-yes" className="border-slate-600" />
                        <Label htmlFor="diabetes-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="no" id="diabetes-no" className="border-slate-600" />
                        <Label htmlFor="diabetes-no" className="font-normal cursor-pointer text-slate-300">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">3. Any previous stroke or TIA?</Label>
                  <RadioGroup value={formData.previousStroke} onValueChange={(value) => setFormData({ ...formData, previousStroke: value })}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="yes" id="stroke-yes" className="border-slate-600" />
                        <Label htmlFor="stroke-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="no" id="stroke-no" className="border-slate-600" />
                        <Label htmlFor="stroke-no" className="font-normal cursor-pointer text-slate-300">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">4. Known heart disease?</Label>
                  <RadioGroup value={formData.heartDisease} onValueChange={(value) => setFormData({ ...formData, heartDisease: value })}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="yes" id="heart-yes" className="border-slate-600" />
                        <Label htmlFor="heart-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="no" id="heart-no" className="border-slate-600" />
                        <Label htmlFor="heart-no" className="font-normal cursor-pointer text-slate-300">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-white">5. Smoking or alcohol use?</Label>
                  <RadioGroup value={formData.smokingAlcohol} onValueChange={(value) => setFormData({ ...formData, smokingAlcohol: value })}>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="yes" id="smoking-yes" className="border-slate-600" />
                        <Label htmlFor="smoking-yes" className="font-normal cursor-pointer text-slate-300">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                        <RadioGroupItem value="no" id="smoking-no" className="border-slate-600" />
                        <Label htmlFor="smoking-no" className="font-normal cursor-pointer text-slate-300">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div ref={summaryRef} className="space-y-6">
            <Card className="bg-slate-900 border border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden sticky top-6">
              <CardHeader className="border-b border-slate-800 bg-gradient-to-r from-indigo-500 to-purple-600">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Patient Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Name:</span>
                    <span className="font-semibold text-sm text-white">{formData.name || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Age:</span>
                    <span className="font-semibold text-sm text-white">{formData.age ? `${formData.age} years` : "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Gender:</span>
                    <span className="font-semibold text-sm text-white">{formData.gender || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Phone:</span>
                    <span className="font-semibold text-sm text-white">{formData.phone || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Patient ID:</span>
                    <span className="font-mono text-xs text-white bg-slate-700 px-3 py-1.5 rounded-lg">{formData.mrn}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-400">Visit Date:</span>
                    <span className="font-medium text-xs text-white">{currentDate}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={handleSave} 
                    className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Patient
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={onBack}
                    className="w-full h-11 rounded-xl bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};