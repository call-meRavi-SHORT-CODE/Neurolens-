import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createPatient, calculateBMI, Patient } from "@/lib/database";

interface PatientRegistrationProps {
  onBack: () => void;
  onPatientCreated?: (patient: Patient) => void;
}

export const PatientRegistration = ({ onBack, onPatientCreated }: PatientRegistrationProps) => {
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    age: "",
    gender: "",
    mrn: `MRN${Date.now()}`, // Auto-generated
    phone: "",
    address: "",
    height: "",
    weight: "",
    bloodGroup: "",
    physician: "",
    allergies: "",
    notes: ""
  });

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getLocalBMI = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    if (height && weight) {
      const heightInM = height / 100;
      return (weight / (heightInM * heightInM)).toFixed(1);
    }
    return null;
  };

  const handleSave = async () => {
    if (!formData.name || (!formData.dob && !formData.age)) {
      toast({
        title: "Validation Error",
        description: "Name and either Date of Birth or Age are required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate age range if provided
    if (formData.age && (parseInt(formData.age) < 0 || parseInt(formData.age) > 150)) {
      toast({
        title: "Validation Error",
        description: "Age must be between 0 and 150 years.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate BMI if height and weight are provided
      const calculatedBMI = formData.height && formData.weight ? 
        calculateBMI(parseFloat(formData.height), parseFloat(formData.weight)) : null;

      // Prepare patient data
      const patientData = {
        name: formData.name,
        dob: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        mrn: formData.mrn,
        phone: formData.phone || null,
        address: formData.address || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        bmi: calculatedBMI,
        blood_group: formData.bloodGroup || null,
        physician: formData.physician || null,
        allergies: formData.allergies || null,
        notes: formData.notes || null
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

  const age = calculateAge(formData.dob);
  const bmi = getLocalBMI();

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
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Patient Information
                </CardTitle>
                <CardDescription>Basic patient details and demographics</CardDescription>
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
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => {
                        const newFormData = { ...formData, dob: e.target.value };
                        // Auto-update age when DOB changes
                        if (e.target.value) {
                          const calculatedAge = calculateAge(e.target.value);
                          newFormData.age = calculatedAge.toString();
                        }
                        setFormData(newFormData);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Enter age"
                    />
                    <p className="text-xs text-muted-foreground">
                      Either Date of Birth or Age is required
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn">Medical Record Number</Label>
                    <Input
                      id="mrn"
                      value={formData.mrn}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physician">Primary Physician</Label>
                    <Input
                      id="physician"
                      value={formData.physician}
                      onChange={(e) => setFormData({ ...formData, physician: e.target.value })}
                      placeholder="Enter physician name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
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
          </div>

          {/* Measurements & Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Physical Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    placeholder="Enter height"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="Enter weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">
                    {formData.age ? `${formData.age} years` : 
                     (age > 0 ? `${age} years (calculated)` : "Not set")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BMI:</span>
                  <span className="font-medium">{bmi || "Not calculated"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRN:</span>
                  <span className="font-medium text-xs">{formData.mrn}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="List any known allergies"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or comments"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

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