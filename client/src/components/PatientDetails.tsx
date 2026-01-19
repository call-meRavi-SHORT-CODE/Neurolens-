import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, User, Calendar, Phone, MapPin, Activity, TrendingUp, Edit, Save, X, Users, Search as SearchIcon } from "lucide-react";
import { Patient, Visit, getPatients, getPatientById, getVisitsByPatient, updatePatient, searchPatients } from "@/lib/database";
import { toast } from "sonner";

interface PatientDetailsProps {
  patientId?: string;
  onBack: () => void;
}

export const PatientDetails = ({ patientId, onBack }: PatientDetailsProps) => {
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Patient>>({});
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchAllPatients();
  }, []);

  useEffect(() => {
    if (patientId) {
      loadPatientDetails(patientId);
    }
  }, [patientId]);

  useEffect(() => {
    handleSearch();
  }, [searchTerm, allPatients]);

  const fetchAllPatients = async () => {
    setLoading(true);
    try {
      const patientsData = await getPatients();
      setAllPatients(patientsData || []);
      setFilteredPatients(patientsData || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.length >= 2) {
      try {
        const results = await searchPatients(searchTerm);
        setFilteredPatients(results || []);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setFilteredPatients(allPatients);
    }
  };

  const loadPatientDetails = async (id: string) => {
    try {
      const [patientData, visitsData] = await Promise.all([
        getPatientById(id),
        getVisitsByPatient(id)
      ]);
      setSelectedPatient(patientData);
      setVisits(visitsData || []);
      setEditFormData(patientData);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast("Failed to load patient details");
    }
  };

  const handlePatientClick = (patient: Patient) => {
    loadPatientDetails(patient.id);
  };

  const handleEditClick = () => {
    if (selectedPatient) {
      setEditFormData(selectedPatient);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (selectedPatient) {
      setEditFormData(selectedPatient);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPatient || !editFormData) return;

    try {
      const updatedPatient = await updatePatient(selectedPatient.id, {
        name: editFormData.name,
        age: editFormData.age,
        gender: editFormData.gender,
        phone: editFormData.phone,
        address: editFormData.address,
        notes: editFormData.notes
      });

      setSelectedPatient(updatedPatient);
      setIsEditing(false);
      
      // Refresh the patients list
      await fetchAllPatients();
      
      toast("Patient information updated successfully");
    } catch (error) {
      console.error('Error updating patient:', error);
      toast("Failed to update patient information");
    }
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

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { category: "Normal", color: "text-green-600" };
    if (bmi < 30) return { category: "Overweight", color: "text-yellow-600" };
    return { category: "Obese", color: "text-red-600" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sky-200">Loading patients...</p>
        </div>
      </div>
    );
  }

  // Main Patient List View
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Patient Directory</h1>
            <p className="text-sky-200">View and edit patient information</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-200 w-4 h-4" />
          <Input
            placeholder="Search patients by name, MRN, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patient Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-12 h-12 mx-auto text-sky-200/50 mb-3" />
              <p className="text-sky-200">
                {searchTerm ? `No patients found matching "${searchTerm}"` : "No patients registered yet"}
              </p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <Card 
                key={patient.id} 
                className="cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => handlePatientClick(patient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{patient.name}</h4>
                      <p className="text-sm text-sky-200 truncate">MRN: {patient.mrn}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getAge(patient) && (
                      <Badge variant="outline">{getAge(patient)} years</Badge>
                    )}
                    {patient.gender && (
                      <Badge variant="outline" className="capitalize">{patient.gender}</Badge>
                    )}
                  </div>
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm text-sky-200">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{patient.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Patient Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPatient?.name}</span>
                {!isEditing && (
                  <Button onClick={handleEditClick} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>
                MRN: {selectedPatient?.mrn}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name *</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.name || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-age">Age</Label>
                      <Input
                        id="edit-age"
                        type="number"
                        value={editFormData.age || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value) || undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-gender">Gender</Label>
                      <Select 
                        value={editFormData.gender || ""} 
                        onValueChange={(value) => setEditFormData({ ...editFormData, gender: value })}
                      >
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
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        value={editFormData.phone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editFormData.address || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Medical Notes</Label>
                    <Input
                      id="edit-notes"
                      value={editFormData.notes || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                selectedPatient && (
                  <div className="space-y-6">
                    {/* Patient Information */}
                    <div>
                      <h3 className="font-semibold mb-3">Patient Information</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-sky-200">Age:</span>
                          <p className="font-medium">{getAge(selectedPatient)} years</p>
                        </div>
                        {selectedPatient.gender && (
                          <div>
                            <span className="text-sky-200">Gender:</span>
                            <p className="font-medium capitalize">{selectedPatient.gender}</p>
                          </div>
                        )}
                        {selectedPatient.phone && (
                          <div>
                            <span className="text-sky-200">Phone:</span>
                            <p className="font-medium">{selectedPatient.phone}</p>
                          </div>
                        )}
                        {selectedPatient.address && (
                          <div className="col-span-2">
                            <span className="text-sky-200">Address:</span>
                            <p className="font-medium">{selectedPatient.address}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPatient.notes && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">Medical Notes</h3>
                          <p className="text-sm">{selectedPatient.notes}</p>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Visit History */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Visit History ({visits.length})
                      </h3>
                      {visits.length === 0 ? (
                        <p className="text-sm text-sky-200 text-center py-4">No visits recorded</p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {visits.map((visit) => (
                            <Card key={visit.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-medium text-sm">{visit.reason}</p>
                                    <p className="text-xs text-sky-200">
                                      {formatDate(visit.visit_date)}
                                    </p>
                                  </div>
                                  {visit.epwv_risk_level && (
                                    <Badge 
                                      variant={
                                        visit.epwv_risk_level === "High" ? "destructive" : 
                                        visit.epwv_risk_level === "Medium" ? "default" : 
                                        "secondary"
                                      }
                                    >
                                      {visit.epwv_risk_level} Risk
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-sky-200">BP:</span>
                                    <span className="ml-1 font-medium">{visit.systolic}/{visit.diastolic} mmHg</span>
                                  </div>
                                  {visit.epwv_result && (
                                    <div>
                                      <span className="text-sky-200">ePWV:</span>
                                      <span className="ml-1 font-medium">{visit.epwv_result} m/s</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};