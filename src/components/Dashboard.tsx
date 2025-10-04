import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, Camera, Plus, RefreshCw, Users, AlertTriangle, TrendingUp, LogOut, Settings, Search, UserPlus, ArrowLeft } from "lucide-react";
import { PatientRegistration } from "./PatientRegistration";
import { NewVisit } from "./NewVisit";
import { CameraInterface } from "./CameraInterface";
import { PatientDetails } from "./PatientDetails";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Patient, Visit, getPatients, getVisits, searchPatients } from "@/lib/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Dashboard = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "newPatient" | "newVisit" | "camera" | "patientDetails" | "patientList">("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [patientsData, visitsData] = await Promise.all([
        getPatients(),
        getVisits()
      ]);
      setPatients(patientsData || []);
      setVisits(visitsData || []);
      setFilteredPatients(patientsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatients = async (term: string) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      try {
        const results = await searchPatients(term);
        setFilteredPatients(results || []);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setFilteredPatients(patients);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView("patientDetails");
  };

  const getTodaysVisits = () => {
    const today = new Date().toDateString();
    return visits.filter(visit => new Date(visit.visit_date).toDateString() === today);
  };

  const getHighRiskVisits = () => {
    return visits.filter(visit => visit.epwv_risk_level === "High");
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (activeView === "newPatient") {
    return <PatientRegistration onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "newVisit") {
    return <NewVisit onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "camera") {
    return <CameraInterface onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "patientDetails" && selectedPatientId) {
    return (
      <PatientDetails 
        patientId={selectedPatientId} 
        onBack={() => {
          setActiveView("dashboard");
          setSelectedPatientId(null);
        }} 
      />
    );
  }

  if (activeView === "patientList") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setActiveView("dashboard")} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Patient Directory</h1>
              <p className="text-muted-foreground">Browse and search all patients</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search patients by name, MRN, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearchPatients(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setActiveView("newPatient")}>
              <UserPlus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Patients ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading patients...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? `No patients found matching "${searchTerm}"` : "No patients registered yet"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.map((patient) => (
                    <Card key={patient.id} className="cursor-pointer hover:bg-accent/5 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{patient.name}</h4>
                            <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {getAge(patient) && (
                              <Badge variant="outline">{getAge(patient)} years</Badge>
                            )}
                            {patient.gender && (
                              <Badge variant="outline">{patient.gender}</Badge>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handlePatientSelect(patient.id)}
                          >
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hi {profile?.name || 'Doctor'}</h1>
            <p className="text-muted-foreground">Welcome to NeuroLens - {profile?.hospital_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              <Activity className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.name ? getUserInitials(profile.name) : 'DR'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <p className="text-xs text-muted-foreground">{profile?.hospital_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            onClick={() => setActiveView("newPatient")} 
            className="h-16 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Patient
          </Button>
          <Button 
            onClick={() => setActiveView("newVisit")} 
            variant="secondary" 
            className="h-16"
          >
            <Users className="w-5 h-5 mr-2" />
            New Visit
          </Button>
          <Button 
            onClick={() => setActiveView("camera")} 
            variant="outline" 
            className="h-16 border-accent text-accent hover:bg-accent/10"
          >
            <Camera className="w-5 h-5 mr-2" />
            Camera
          </Button>
          <Button 
            onClick={() => setActiveView("patientList")} 
            variant="outline" 
            className="h-16 border-accent text-accent hover:bg-accent/10"
          >
            <Search className="w-5 h-5 mr-2" />
            Patient Details
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTodaysVisits().length}</div>
              <p className="text-xs text-muted-foreground">
                Visits completed today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High-Risk Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{getHighRiskVisits().length}</div>
              <p className="text-xs text-muted-foreground">
                Require follow-up
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{patients.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered patients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest patient visits and assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-muted-foreground">Loading recent activity...</p>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No visits recorded yet</p>
                <Button 
                  onClick={() => setActiveView("newVisit")} 
                  className="mt-3" 
                  size="sm"
                >
                  Create First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.slice(0, 5).map((visit, index) => {
                  const patient = patients.find(p => p.id === visit.patient_id);
                  const age = patient ? getAge(patient) : null;
                  
                  return (
                    <div 
                      key={visit.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-accent/5 cursor-pointer transition-colors"
                      onClick={() => patient && handlePatientSelect(patient.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient?.name || 'Unknown Patient'}
                            {age && `, ${age}y`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {visit.reason} • {visit.epwv_result ? `ePWV: ${visit.epwv_result} m/s` : 'No ePWV data'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {visit.epwv_risk_level && (
                          <Badge 
                            variant={
                              visit.epwv_risk_level === "High" ? "destructive" : 
                              visit.epwv_risk_level === "Medium" ? "default" : 
                              "secondary"
                            }
                            className={visit.epwv_risk_level === "Medium" ? "bg-warning text-warning-foreground" : ""}
                          >
                            {visit.epwv_risk_level} Risk
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {visits.length > 5 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveView("patientList")}
                    >
                      View All Visits
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};