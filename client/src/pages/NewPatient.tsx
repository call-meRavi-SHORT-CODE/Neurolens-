import { PatientRegistration } from "@/components/PatientRegistration";
import { useNavigate } from "react-router-dom";
import { Patient } from "@/lib/database";

const NewPatient = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handlePatientCreated = (patient: Patient) => {
    // Navigate back with success
    navigate(-1);
  };

  return (
    <PatientRegistration 
      onBack={handleBack}
      onPatientCreated={handlePatientCreated}
    />
  );
};

export default NewPatient;