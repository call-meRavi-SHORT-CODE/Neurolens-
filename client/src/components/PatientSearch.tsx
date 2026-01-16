import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User } from "lucide-react";
import { Patient, searchPatients, getPatients } from "@/lib/database";
import { toast } from "@/hooks/use-toast";

interface PatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
  onNewPatient: () => void;
}

export const PatientSearch = ({ onPatientSelect, onNewPatient }: PatientSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all patients on component mount
  useEffect(() => {
    loadAllPatients();
  }, []);

  // Filter patients when search term changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      handleSearch();
    } else {
      setPatients(allPatients);
    }
  }, [searchTerm, allPatients]);

  const loadAllPatients = async () => {
    setLoading(true);
    try {
      const results = await getPatients();
      setAllPatients(results || []);
      setPatients(results || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive"
      });
      console.error('Load patients error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await searchPatients(searchTerm);
      setPatients(results || []);
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search patients",
        variant: "destructive"
      });
      console.error('Search error:', error);
    } finally {
      setLoading(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Patient Selection
        </CardTitle>
        <CardDescription>Search for an existing patient or create a new one</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name, MRN, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={onNewPatient} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        )}

        {!loading && patients.length === 0 && searchTerm.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No patients registered yet</p>
            <p className="text-sm mt-2">Create your first patient to get started</p>
            <Button onClick={onNewPatient} className="mt-4" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create First Patient
            </Button>
          </div>
        )}

        {!loading && patients.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {patients.map((patient) => (
              <Card key={patient.id} className="cursor-pointer hover:bg-accent/5 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{patient.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>MRN: {patient.mrn}</span>
                          {getAge(patient) && <Badge variant="outline">{getAge(patient)} years</Badge>}
                          {patient.gender && <Badge variant="outline">{patient.gender}</Badge>}
                        </div>
                        {patient.phone && (
                          <p className="text-xs text-muted-foreground mt-1">{patient.phone}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={() => onPatientSelect(patient)}
                      size="sm"
                    >
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && searchTerm.length > 0 && patients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No patients found matching "{searchTerm}"</p>
            <p className="text-sm mt-2">Try a different search or create a new patient</p>
            <Button onClick={onNewPatient} className="mt-4" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New Patient
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};