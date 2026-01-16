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
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setActiveView("dashboard")} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Patient Directory</h1>
              <p className="text-slate-400">Browse and search all patients</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search patients by name, MRN, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearchPatients(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>
            <Button onClick={() => setActiveView("newPatient")} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500">
              <UserPlus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">All Patients ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading patients...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">
                    {searchTerm ? `No patients found matching "${searchTerm}"` : "No patients registered yet"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.map((patient) => (
                    <Card key={patient.id} className="cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/30 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <Users className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{patient.name}</h4>
                            <p className="text-sm text-slate-400">MRN: {patient.mrn}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {getAge(patient) && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">{getAge(patient)} years</Badge>
                            )}
                            {patient.gender && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">{patient.gender}</Badge>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handlePatientSelect(patient.id)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
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
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">NeuroLens</h2>
              
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
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
          <h1 className="text-3xl font-bold text-white">
            Welcome back, Doctor 👋
          </h1>
          <p className="text-slate-400">
            Here's what's happening with your practice today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button 
            ref={el => quickActionsRef.current[0] = el}
            onClick={() => setActiveView("newPatient")} 
            className="h-20 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 rounded-2xl justify-start px-8 group border border-cyan-400/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">New Patient</span>
            </div>
          </Button>
          
          <Button 
            ref={el => quickActionsRef.current[1] = el}
            onClick={() => setActiveView("newVisit")} 
            className="h-20 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 rounded-2xl justify-start px-8 group border border-purple-400/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm">
                <Activity className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">New Visit</span>
            </div>
          </Button>
          
          <Button 
            ref={el => quickActionsRef.current[2] = el}
            onClick={() => setActiveView("patientList")} 
            className="h-20 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 rounded-2xl justify-start px-8 group border border-emerald-400/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm">
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
            className="bg-slate-900 border border-slate-800 shadow-lg rounded-2xl overflow-hidden hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">Today's Visits</p>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-white">
                  {getTodaysVisits().length}
                </div>
                <p className="text-xs text-emerald-400">
                  ↑ 12% from yesterday
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            ref={el => statsRef.current[1] = el}
            className="bg-slate-900 border border-slate-800 shadow-lg rounded-2xl overflow-hidden hover:shadow-red-500/10 hover:border-red-500/30 transition-all"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">High-Risk Alerts</p>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-white">
                  {getHighRiskVisits().length}
                </div>
                <p className="text-xs text-slate-400">
                  Require immediate review
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            ref={el => statsRef.current[2] = el}
            className="bg-slate-900 border border-slate-800 shadow-lg rounded-2xl overflow-hidden hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">Total Patients</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold text-white">
                  {patients.length.toLocaleString()}
                </div>
                <p className="text-xs text-slate-400">
                  Registered in NeuroLens system
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card ref={activityRef} className="bg-slate-900 border border-slate-800 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Latest patient visits and assessments</CardDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchDashboardData}
                className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm">Loading recent activity...</p>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-400 mb-4">No visits recorded yet</p>
                <Button 
                  onClick={() => setActiveView("newVisit")} 
                  className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                      className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors rounded-lg group"
                      onClick={() => patient && handlePatientSelect(patient.id)}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-cyan-500/20">
                          <span className="text-sm font-semibold text-cyan-400">
                            {patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'UK'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            {patient?.name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-slate-400">
                            ID: {patient?.mrn || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex flex-col justify-center">
                        <p className="font-medium text-sm text-white">{visit.reason}</p>
                        <p className="text-xs text-slate-400">
                          {visit.epwv_result ? `ePWV: ${visit.epwv_result} m/s` : 'Assessment pending'}
                        </p>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        {visit.epwv_risk_level ? (
                          <Badge 
                            className={`rounded-lg px-3 py-1 text-xs font-medium ${
                              visit.epwv_risk_level === "High" 
                                ? "bg-red-500/10 text-red-400 border border-red-500/30" 
                                : visit.epwv_risk_level === "Medium"
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {visit.epwv_risk_level === "High" ? "COMPLETED" : visit.epwv_risk_level === "Medium" ? "PENDING" : "IN PROGRESS"}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-700 text-slate-300 border border-slate-600 rounded-lg px-3 py-1 text-xs">
                            PENDING
                          </Badge>
                        )}
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        <p className="text-sm text-slate-400">
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* View All Link */}
                {visits.length > 5 && (
                  <div className="text-center pt-4 border-t border-slate-800 mt-2">
                    <Button 
                      variant="ghost" 
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-medium"
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