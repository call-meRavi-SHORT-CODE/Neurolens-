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
  onPatientSelect?: (patientId: string) => void;
}

export const PatientDetails = ({ patientId, onBack, onPatientSelect }: PatientDetailsProps) => {
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchAllPatients();
  }, []);

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
    setLoading(true);
    try {
      const [patientData, visitsData] = await Promise.all([
        getPatientById(id),
        getVisitsByPatient(id)
      ]);
      setSelectedPatient(patientData);
      setVisits(visitsData || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error("Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patient: Patient) => {
    setSelectedPatient(patient);
    await loadPatientDetails(patient.id);
    setShowDetailsDialog(true);
    onPatientSelect?.(patient.id);
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
      <div className="min-h-screen bg-[#0a0e1a] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="p-2 hover:bg-[#1a2332] rounded-lg text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Patient Directory</h1>
              <p className="text-xs text-slate-400">Browse and search all patients</p>
            </div>
          </div>
          <Button className="bg-sky-400 hover:bg-sky-500 text-black font-semibold rounded-lg">
            <User className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            placeholder="Search patients by name, MRN, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-[#0f1419] border-slate-800 text-white placeholder:text-slate-500 focus:border-sky-400 rounded-xl"
          />
        </div>

        {/* All Patients Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">All Patients</h2>
          <Badge className="bg-sky-500/20 text-sky-400 border-none font-semibold">
            {filteredPatients.length} Total
          </Badge>
        </div>

        {/* Patient List */}
        <div className="space-y-3">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-[#0f1419] rounded-2xl">
              <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? `No patients found matching "${searchTerm}"` : "No patients registered yet"}
              </p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div 
                key={patient.id} 
                className="bg-[#0f1419] hover:bg-[#1a2332] transition-colors cursor-pointer rounded-xl p-3 sm:p-5"
                onClick={() => handlePatientClick(patient)}
              >
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-400/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">{patient.name}</h3>
                      <p className="text-xs text-sky-400 truncate">MRN: {patient.mrn}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-13">
                    {patient.phone && (
                      <p className="text-xs text-slate-300 truncate"><span className="text-slate-500">Phone:</span> {patient.phone}</p>
                    )}
                    {getAge(patient) && (
                      <p className="text-xs text-slate-300"><span className="text-slate-500">Age:</span> {getAge(patient)} yrs</p>
                    )}
                    {patient.gender && (
                      <p className="text-xs text-slate-300 capitalize"><span className="text-slate-500">Gender:</span> {patient.gender}</p>
                    )}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-sky-400/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base mb-1 truncate">{patient.name}</h3>
                      <p className="text-sm text-sky-400 truncate">MRN: {patient.mrn}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {getAge(patient) && (
                        <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 font-medium px-3 whitespace-nowrap">
                          {getAge(patient)} YEARS
                        </Badge>
                      )}
                      {patient.gender && (
                        <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 font-medium uppercase px-3 whitespace-nowrap">
                          {patient.gender}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-6 flex-shrink-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Last Visit</p>
                    <p className="text-sm text-white font-medium">
                      {patient.created_at 
                        ? new Date(patient.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Oct 12, 2023'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredPatients.length > 0 && (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm mb-3">Showing top results for all patients. Load more...</p>
            <Button variant="ghost" className="text-sky-400 hover:bg-sky-500/10">
              View All →
            </Button>
          </div>
        )}
      </div>

      {/* Patient Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl bg-[#0f1419] border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {selectedPatient?.name}
            </DialogTitle>
            <p className="text-sm text-sky-400">MRN: {selectedPatient?.mrn}</p>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Patient Information Card */}
            <Card className="bg-[#1a2332] border-slate-800/50 rounded-xl">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-white text-lg">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Age</p>
                    <p className="text-base font-semibold text-white">
                      {selectedPatient && getAge(selectedPatient)} years
                    </p>
                  </div>
                  {selectedPatient?.gender && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gender</p>
                      <p className="text-base font-semibold text-white capitalize">{selectedPatient.gender}</p>
                    </div>
                  )}
                  {selectedPatient?.phone && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-base font-semibold text-white">{selectedPatient.phone}</p>
                    </div>
                  )}
                  {selectedPatient?.address && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                      <p className="text-base font-semibold text-white">{selectedPatient.address}</p>
                    </div>
                  )}
                </div>
                {selectedPatient?.notes && (
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Medical Notes</p>
                    <p className="text-white text-sm">{selectedPatient.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit History Card */}
            <Card className="bg-[#1a2332] border-slate-800/50 rounded-xl">
              <CardHeader className="border-b border-slate-800/50">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Visit History ({visits.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 max-h-96 overflow-y-auto">
                {visits.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No visits recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visits.map((visit) => (
                      <div key={visit.id} className="bg-[#0a0e1a] border-l-4 border-l-sky-400 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-white">{visit.reason}</p>
                            <p className="text-sm text-slate-400">{formatDate(visit.visit_date)}</p>
                          </div>
                          {visit.epwv_risk_level && (
                            <Badge 
                              className={
                                visit.epwv_risk_level === "High" ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                                visit.epwv_risk_level === "Medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : 
                                "bg-green-500/20 text-green-400 border-green-500/30"
                              }
                            >
                              {visit.epwv_risk_level} Risk
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">BP:</span>
                            <span className="ml-2 text-white font-medium">{visit.systolic}/{visit.diastolic} mmHg</span>
                          </div>
                          {visit.epwv_result && (
                            <div>
                              <span className="text-slate-500">ePWV:</span>
                              <span className="ml-2 text-white font-medium">{visit.epwv_result} m/s</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};