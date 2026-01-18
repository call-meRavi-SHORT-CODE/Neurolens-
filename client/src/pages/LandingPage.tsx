import { useEffect } from "react";
import {
  Navbar,
  HeroSection,
  ProblemSection,
  SolutionSection,
  HowItWorksSection,
  ImpactSection,
  Footer,
  AmbientBackground,
} from "@/components/landing";

const LandingPage = () => {
  // Hide scrollbar on mount, restore on unmount
  useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide');
    document.body.classList.add('scrollbar-hide');
    
    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
      document.body.classList.remove('scrollbar-hide');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <HeroSection />
      <div className="relative">
        <AmbientBackground />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <ImpactSection />
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage;
