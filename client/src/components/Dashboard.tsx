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
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setActiveView("dashboard")} className="p-2 text-sky-400 hover:text-sky-300 hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Patient Directory</h1>
              <p className="text-sky-200">Browse and search all patients</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-400 w-4 h-4" />
              <Input
                placeholder="Search patients by name, MRN, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearchPatients(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-sky-300 focus:border-sky-500"
              />
            </div>
            <Button onClick={() => setActiveView("newPatient")} className="bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4"></div>
                  <p className="text-sky-200">Loading patients...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-sky-400 mb-3" />
                  <p className="text-sky-200">
                    {searchTerm ? `No patients found matching "${searchTerm}"` : "No patients registered yet"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.map((patient) => (
                    <Card key={patient.id} className="cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-sky-500 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                            <Users className="w-5 h-5 text-sky-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{patient.name}</h4>
                            <p className="text-sm text-sky-200">MRN: {patient.mrn}</p>
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
                            className="bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white"
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
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="bg-[#0a0a0a] border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left - Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-cyan-500/50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="font-semibold text-base text-white tracking-widest">NEUROLENS</h2>
          </div>
          
          {/* Right - User Profile and Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  Dr. {profile?.name ? (profile.name.length > 10 ? profile.name.substring(0, 10) + '...' : profile.name) : 'Julian Vance'}
                </p>
                <p className="text-xs text-cyan-400 uppercase tracking-wider">Neurosurgeon</p>
              </div>
              <Button variant="ghost" className="h-10 w-10 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-transparent text-cyan-400 font-semibold">
                    {profile?.name ? getUserInitials(profile.name) : 'JV'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 uppercase tracking-wider text-xs font-medium px-6"
            >
              LOGOUT <LogOut className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div ref={headerRef} className="space-y-1">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, Doctor
          </h1>
          <p className="text-sm text-slate-400">
            Managing Excellence Together with NeuroLens
          </p>
        </div>

        {/* Primary Operations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-cyan-400 rounded-full"></div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Primary Operations</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card 
              ref={el => quickActionsRef.current[0] = el}
              onClick={() => setActiveView("newPatient")} 
              className="bg-slate-900/50 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all duration-300 group hover:shadow-lg hover:shadow-sky-500/20"
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:bg-sky-500/20 transition-all group-hover:shadow-lg group-hover:shadow-sky-500/50">
                  <UserPlus className="w-8 h-8 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">New Patient</h3>
                  <p className="text-xs text-slate-400">Register new patient</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              ref={el => quickActionsRef.current[1] = el}
              onClick={() => setActiveView("newVisit")} 
              className="bg-slate-900/50 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all duration-300 group hover:shadow-lg hover:shadow-sky-500/20"
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:bg-sky-500/20 transition-all group-hover:shadow-lg group-hover:shadow-sky-500/50">
                  <Activity className="w-8 h-8 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">New Visit</h3>
                  <p className="text-xs text-slate-400">Start new consultation</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              ref={el => quickActionsRef.current[2] = el}
              onClick={() => setActiveView("patientList")} 
              className="bg-slate-900/50 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all duration-300 group hover:shadow-lg hover:shadow-sky-500/20"
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:bg-sky-500/20 transition-all group-hover:shadow-lg group-hover:shadow-sky-500/50">
                  <Users className="w-8 h-8 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Patient Records</h3>
                  <p className="text-xs text-slate-400">View all records</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-cyan-400 rounded-full"></div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registry Metrics</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Stats Boxes */}
            <div className="space-y-4">
              <Card 
                ref={el => statsRef.current[0] = el}
                className="bg-slate-900/30 border-l-4 border-l-cyan-400 border-t border-r border-b border-slate-800 hover:bg-slate-900/50 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Registry</p>
                      <p className="text-4xl font-bold text-white">{patients.length.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                ref={el => statsRef.current[1] = el}
                className="bg-slate-900/30 border-l-4 border-l-slate-700 border-t border-r border-b border-slate-800 hover:bg-slate-900/50 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Compliance</p>
                      <p className="text-4xl font-bold text-cyan-400">100<span className="text-2xl ml-1">%</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Circular Stats in Triangle Layout */}
            <div className="flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Top Circle - Visits Today */}
                <div 
                  ref={el => statsRef.current[2] = el}
                  className="absolute top-0 left-1/2 transform -translate-x-1/2"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative w-40 h-40">
                      <svg className="transform -rotate-90 w-40 h-40">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          className="text-slate-800"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(getTodaysVisits().length / 30) * 439.82} 439.82`}
                          className="text-cyan-400"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-white">{getTodaysVisits().length}</p>
                          <p className="text-xs text-cyan-400 uppercase tracking-wider mt-1">Visits Today</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Left Circle - Critical Alerts */}
                <div className="absolute bottom-0 left-0">
                  <div className="flex flex-col items-center">
                    <div className="relative w-36 h-36">
                      <svg className="transform -rotate-90 w-36 h-36">
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          className="text-slate-800"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray="0 401.92"
                          className="text-slate-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-white">0</p>
                          <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Critical Alerts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Right Circle - Active Sessions */}
                <div className="absolute bottom-0 right-0">
                  <div className="flex flex-col items-center">
                    <div className="relative w-36 h-36">
                      <svg className="transform -rotate-90 w-36 h-36">
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          className="text-slate-800"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="64"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(getHighRiskVisits().length / 30) * 401.92} 401.92`}
                          className="text-cyan-400"
                          style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.5))' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-white">{getHighRiskVisits().length}</p>
                          <p className="text-xs text-cyan-400 uppercase tracking-wider mt-1">Active Sessions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Feed */}
        <Card ref={activityRef} className="bg-slate-900/50 border border-slate-800">
          <CardHeader className="border-b border-slate-800 bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-cyan-400 rounded-full"></div>
                <div>
                  <CardTitle className="text-base font-semibold text-white">Clinical Feed</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">Recent Activity Stream</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 uppercase tracking-wider"
                >
                  Download Report
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={fetchDashboardData}
                  className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm">Loading clinical feed...</p>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 mb-4">No visits recorded yet</p>
                <Button 
                  onClick={() => setActiveView("newVisit")} 
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-600"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <div className="col-span-3">Patient Name</div>
                  <div className="col-span-3">Current Procedure</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Standardized Date</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                {visits.slice(0, 5).map((visit) => {
                  const patient = visit.patient || patients.find(p => p.id === visit.patient_id);
                  const age = patient ? getAge(patient) : null;
                  
                  return (
                    <div 
                      key={visit.id} 
                      className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors group"
                      onClick={() => patient && handlePatientSelect(patient.id)}
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-slate-400">
                            {patient?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'UK'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white text-sm truncate">
                            {patient?.name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {patient?.mrn || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center">
                        <p className="text-sm text-slate-300">{visit.reason}</p>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                        {visit.epwv_risk_level ? (
                          <Badge 
                            className={`rounded-md px-3 py-1 text-xs font-medium ${
                              visit.epwv_risk_level === "High" 
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                                : visit.epwv_risk_level === "Medium"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {visit.epwv_risk_level === "High" ? "ADMITTED" : visit.epwv_risk_level === "Medium" ? "TALKABLE" : "PROCESSING"}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 border border-slate-700 rounded-md px-3 py-1 text-xs">
                            PROCESSING
                          </Badge>
                        )}
                      </div>
                      
                      <div className="col-span-3 flex items-center">
                        <p className="text-sm text-slate-400">
                          {new Date(visit.visit_date).toLocaleDateString('en-US', { 
                            day: '2-digit',
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs px-2"
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* View All Link */}
                {visits.length > 5 && (
                  <div className="text-center pt-4 mt-2">
                    <Button 
                      variant="ghost" 
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-medium text-sm"
                      onClick={() => setActiveView("patientList")}
                    >
                      VIEW COMPLETE ARCHIVE →
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