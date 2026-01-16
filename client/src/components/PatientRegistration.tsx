import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, User, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createPatient, Patient } from "@/lib/database";

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Patient Registration</h1>
            <p className="text-muted-foreground">Register a new patient in the system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Patient Basic Details
                </CardTitle>
                <CardDescription>Required patient information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter patient's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Enter age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn">Patient ID</Label>
                    <Input
                      id="mrn"
                      value={formData.mrn}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Auto-generated</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitDate">Date of Visit</Label>
                    <Input
                      id="visitDate"
                      value={currentDate}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Auto-filled</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address (optional)</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter patient address"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Medical History
                </CardTitle>
                <CardDescription>Answer the following yes/no questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>1. History of high blood pressure?</Label>
                  <RadioGroup value={formData.highBloodPressure} onValueChange={(value) => setFormData({ ...formData, highBloodPressure: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="bp-yes" />
                        <Label htmlFor="bp-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="bp-no" />
                        <Label htmlFor="bp-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>2. History of diabetes?</Label>
                  <RadioGroup value={formData.diabetes} onValueChange={(value) => setFormData({ ...formData, diabetes: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="diabetes-yes" />
                        <Label htmlFor="diabetes-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="diabetes-no" />
                        <Label htmlFor="diabetes-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>3. Any previous stroke or TIA?</Label>
                  <RadioGroup value={formData.previousStroke} onValueChange={(value) => setFormData({ ...formData, previousStroke: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="stroke-yes" />
                        <Label htmlFor="stroke-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="stroke-no" />
                        <Label htmlFor="stroke-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>4. Known heart disease?</Label>
                  <RadioGroup value={formData.heartDisease} onValueChange={(value) => setFormData({ ...formData, heartDisease: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="heart-yes" />
                        <Label htmlFor="heart-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="heart-no" />
                        <Label htmlFor="heart-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>5. Smoking or alcohol use?</Label>
                  <RadioGroup value={formData.smokingAlcohol} onValueChange={(value) => setFormData({ ...formData, smokingAlcohol: value })}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="smoking-yes" />
                        <Label htmlFor="smoking-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="smoking-no" />
                        <Label htmlFor="smoking-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.name || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">{formData.age ? `${formData.age} years` : "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium">{formData.gender || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium text-sm">{formData.phone || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient ID:</span>
                  <span className="font-medium text-xs">{formData.mrn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visit Date:</span>
                  <span className="font-medium text-xs">{currentDate}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Save Patient
          </Button>
        </div>
      </div>
    </div>
  );
};