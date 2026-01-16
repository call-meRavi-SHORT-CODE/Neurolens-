import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, Camera, Plus, RefreshCw, Users, AlertTriangle, TrendingUp, LogOut, Settings, Search, UserPlus, ArrowLeft, Brain, Heart, Eye, Sparkles } from "lucide-react";
import { PatientRegistration } from "./PatientRegistration";
import { NewVisit } from "./NewVisit";
import { PatientDetails } from "./PatientDetails";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Patient, Visit, VisitWithPatient, getPatients, getVisits, searchPatients } from "@/lib/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import gsap from "gsap";

export const Dashboard = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "newPatient" | "newVisit" | "patientDetails" | "patientList">("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<VisitWithPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Refs for GSAP animations
  const headerRef = useRef(null);
  const statsRef = useRef<(HTMLDivElement | null)[]>([]);
  const quickActionsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const activityRef = useRef(null);

  // GSAP Animation on mount
  useEffect(() => {
    if (activeView === "dashboard") {
      const ctx = gsap.context(() => {
        // Header animation
        gsap.fromTo(headerRef.current, 
          { opacity: 0, y: -30 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );

        // Quick actions stagger animation
        gsap.fromTo(quickActionsRef.current,
          { opacity: 0, scale: 0.8, y: 20 },
          { 
            opacity: 1, 
            scale: 1, 
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)"
          }
        );

        // Stats cards stagger animation
        gsap.fromTo(statsRef.current,
          { opacity: 0, x: -50 },
          { 
            opacity: 1, 
            x: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "power3.out"
          }
        );

        // Activity card animation
        gsap.fromTo(activityRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: "power3.out" }
        );
      });

      return () => ctx.revert();
    }
  }, [activeView, visits.length, patients.length]);

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

  // Refresh data when returning to dashboard
  useEffect(() => {
    if (activeView === "dashboard") {
      fetchDashboardData();
    }
  }, [activeView]);

  if (activeView === "newPatient") {
    return <PatientRegistration onBack={() => {
      setActiveView("dashboard");
      fetchDashboardData(); // Refresh after patient registration
    }} />;
  }

  if (activeView === "newVisit") {
    return <NewVisit onBack={() => {
      setActiveView("dashboard");
      fetchDashboardData(); // Refresh after visit creation
    }} />;
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
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">NeuroLens</h2>
              
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:border-green-900">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              System Online
            </Badge>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Activity className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      {profile?.name ? getUserInitials(profile.name) : 'DA'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">Dr. {profile?.name || 'Alexander'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email || 'Neurologist'}</p>
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
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Header */}
        <div ref={headerRef} className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">
            Welcome back, Doctor 👋
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground">
            Here's what's happening with your practice today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button 
            ref={el => quickActionsRef.current[0] = el}
            onClick={() => setActiveView("newPatient")} 
            className="h-20 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl justify-start px-8 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">New Patient</span>
            </div>
          </Button>
          
          <Button 
            ref={el => quickActionsRef.current[1] = el}
            onClick={() => setActiveView("newVisit")} 
            className="h-20 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl justify-start px-8 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">New Visit</span>
            </div>
          </Button>
          
          <Button 
            ref={el => quickActionsRef.current[2] = el}
            onClick={() => setActiveView("patientList")} 
            className="h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl justify-start px-8 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">Patient Records</span>
            </div>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            ref={el => statsRef.current[0] = el}
            className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Today's Visits</p>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-gray-900 dark:text-foreground">
                  {getTodaysVisits().length}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  ↑ 12% from yesterday
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            ref={el => statsRef.current[1] = el}
            className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">High-Risk Alerts</p>
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-gray-900 dark:text-foreground">
                  {getHighRiskVisits().length}
                </div>
                <p className="text-xs text-gray-600 dark:text-muted-foreground">
                  Require immediate review
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            ref={el => statsRef.current[2] = el}
            className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-muted-foreground">Total Patients</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-gray-900 dark:text-foreground">
                  {patients.length.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 dark:text-muted-foreground">
                  Registered in NeuroLens system
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card ref={activityRef} className="bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-border bg-gray-50/50 dark:bg-card/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-foreground">Recent Activity</CardTitle>
                  <CardDescription className="text-xs">Latest patient visits and assessments</CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchDashboardData}
                className="rounded-full hover:bg-gray-100 dark:hover:bg-accent"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground text-sm">Loading recent activity...</p>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-muted flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-400 dark:text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No visits recorded yet</p>
                <Button 
                  onClick={() => setActiveView("newVisit")} 
                  className="rounded-xl"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-4">Patient</div>
                  <div className="col-span-3">Assessment</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Timestamp</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                {visits.slice(0, 5).map((visit) => {
                  const patient = visit.patient || patients.find(p => p.id === visit.patient_id);
                  const age = patient ? getAge(patient) : null;
                  
                  return (
                    <div 
                      key={visit.id} 
                      className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-gray-100 dark:border-border hover:bg-gray-50 dark:hover:bg-accent/5 cursor-pointer transition-colors rounded-lg group"
                      onClick={() => patient && handlePatientSelect(patient.id)}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'UK'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-foreground truncate">
                            {patient?.name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-muted-foreground">
                            ID: {patient?.mrn || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex flex-col justify-center">
                        <p className="font-medium text-sm text-gray-900 dark:text-foreground">{visit.reason}</p>
                        <p className="text-xs text-gray-500 dark:text-muted-foreground">
                          {visit.epwv_result ? `ePWV: ${visit.epwv_result} m/s` : 'Assessment pending'}
                        </p>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        {visit.epwv_risk_level ? (
                          <Badge 
                            className={`rounded-lg px-3 py-1 text-xs font-medium ${
                              visit.epwv_risk_level === "High" 
                                ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900" 
                                : visit.epwv_risk_level === "Medium"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900"
                                : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900"
                            }`}
                          >
                            {visit.epwv_risk_level === "High" ? "COMPLETED" : visit.epwv_risk_level === "Medium" ? "PENDING" : "IN PROGRESS"}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 text-xs">
                            PENDING
                          </Badge>
                        )}
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">
                          {new Date(visit.visit_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} • {new Date(visit.visit_date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* View All Link */}
                {visits.length > 5 && (
                  <div className="text-center pt-4 border-t border-gray-100 dark:border-border mt-2">
                    <Button 
                      variant="ghost" 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      onClick={() => setActiveView("patientList")}
                    >
                      View All Activities →
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