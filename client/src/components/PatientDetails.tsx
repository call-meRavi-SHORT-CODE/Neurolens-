import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Calendar, Phone, MapPin, Activity, TrendingUp } from "lucide-react";
import { Patient, Visit, getPatientById, getVisitsByPatient, parseDiseases } from "@/lib/database";
import { toast } from "@/hooks/use-toast";

interface PatientDetailsProps {
  patientId: string;
  onBack: () => void;
}

export const PatientDetails = ({ patientId, onBack }: PatientDetailsProps) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const [patientData, visitsData] = await Promise.all([
          getPatientById(patientId),
          getVisitsByPatient(patientId)
        ]);
        setPatient(patientData);
        setVisits(visitsData || []);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        toast({
          title: "Error",
          description: "Failed to load patient details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

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
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground">Patient Details & Visit History</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{patient.name}</h3>
                  <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{getAge(patient)} years</span>
                  </div>
                  {patient.gender && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="font-medium capitalize">{patient.gender}</span>
                    </div>
                  )}
                  {patient.dob && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DOB:</span>
                      <span className="font-medium">{new Date(patient.dob).toLocaleDateString()}</span>
                    </div>
                  )}
                  {patient.blood_group && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blood Group:</span>
                      <Badge variant="outline">{patient.blood_group}</Badge>
                    </div>
                  )}
                </div>

                {patient.phone && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{patient.phone}</span>
                    </div>
                  </>
                )}

                {patient.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{patient.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Physical Measurements */}
            <Card>
              <CardHeader>
                <CardTitle>Physical Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Height:</span>
                    <span className="font-medium">{patient.height} cm</span>
                  </div>
                )}
                {patient.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{patient.weight} kg</span>
                  </div>
                )}
                {patient.bmi && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BMI:</span>
                    <div className="text-right">
                      <span className="font-medium">{patient.bmi}</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${getBMICategory(patient.bmi).color}`}
                      >
                        {getBMICategory(patient.bmi).category}
                      </Badge>
                    </div>
                  </div>
                )}
                {patient.physician && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Physician:</span>
                      <span className="font-medium">{patient.physician}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Medical Information */}
            {(patient.allergies || patient.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.allergies && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Allergies:</span>
                      <p className="text-sm mt-1">{patient.allergies}</p>
                    </div>
                  )}
                  {patient.notes && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1">{patient.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Visit History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Visit History ({visits.length})
                </CardTitle>
                <CardDescription>Complete medical visit timeline</CardDescription>
              </CardHeader>
              <CardContent>
                {visits.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No visits recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit, index) => (
                      <Card key={visit.id} className="border-l-4 border-l-primary/20">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">{visit.reason}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(visit.visit_date)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              Visit #{visits.length - index}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center p-2 bg-muted/30 rounded">
                              <p className="text-xs text-muted-foreground">BP</p>
                              <p className="font-medium">
                                {visit.systolic}/{visit.diastolic}
                              </p>
                            </div>
                            {visit.heart_rate && (
                              <div className="text-center p-2 bg-muted/30 rounded">
                                <p className="text-xs text-muted-foreground">HR</p>
                                <p className="font-medium">{visit.heart_rate} bpm</p>
                              </div>
                            )}
                            {visit.mean_bp && (
                              <div className="text-center p-2 bg-muted/30 rounded">
                                <p className="text-xs text-muted-foreground">Mean BP</p>
                                <p className="font-medium">{visit.mean_bp} mmHg</p>
                              </div>
                            )}
                            {visit.epwv_result && (
                              <div className="text-center p-2 bg-primary/10 rounded">
                                <p className="text-xs text-muted-foreground">ePWV</p>
                                <p className="font-medium text-primary">
                                  {visit.epwv_result} m/s
                                </p>
                              </div>
                            )}
                          </div>

                          {visit.diseases && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Medical History:</p>
                              <div className="flex flex-wrap gap-1">
                                {parseDiseases(visit.diseases).map((disease) => (
                                  <Badge key={disease} variant="secondary" className="text-xs">
                                    {disease}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {visit.technician && (
                            <p className="text-xs text-muted-foreground">
                              Technician: {visit.technician}
                              {visit.location && ` • Location: ${visit.location}`}
                            </p>
                          )}

                          {visit.epwv_risk_level && (
                            <div className="mt-2 p-2 bg-accent/10 rounded">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Risk Level: 
                                </span>
                                <Badge 
                                  variant={
                                    visit.epwv_risk_level === "High" ? "destructive" : 
                                    visit.epwv_risk_level === "Medium" ? "default" : 
                                    "secondary"
                                  }
                                  className={visit.epwv_risk_level === "Medium" ? "bg-warning text-warning-foreground" : ""}
                                >
                                  {visit.epwv_risk_level}
                                </Badge>
                              </div>
                              {visit.epwv_recommendations && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {visit.epwv_recommendations}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};