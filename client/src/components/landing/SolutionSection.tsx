import { Smartphone, Cpu, Shield, Zap } from "lucide-react";
import EyeVisualization from "./EyeVisualization";

const features = [
  {
    icon: Smartphone,
    title: "Smartphone-Based Imaging",
    description: "Capture retinal images using affordable smartphone attachments",
  },
  {
    icon: Cpu,
    title: "Advanced AI Models",
    description: "ResNet, Siamese Networks & XGBoost for accurate prediction",
  },
  {
    icon: Shield,
    title: "Non-Invasive Screening",
    description: "Safe, painless retinal scanning with no radiation exposure",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get stroke risk assessment within seconds of imaging",
  },
];

const SolutionSection = () => {
  return (
    <section id="solution" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-sky-400 font-semibold text-sm uppercase tracking-wider mb-4 block">
              Our Solution
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Introducing <span className="bg-gradient-to-r from-white via-sky-300 to-cyan-400 bg-clip-text text-transparent">NeuroLens</span>
            </h2>
            <p className="text-lg text-sky-100 mb-8 leading-relaxed">
              A revolutionary AI-powered platform that analyzes retinal vasculature 
              to predict cerebrovascular risk. By examining the eye—the only place 
              where blood vessels are directly visible—we unlock insights into brain health.
            </p>

            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">{feature.title}</h3>
                    <p className="text-sm text-sky-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual - Interactive Eye */}
          <div className="relative">
            <EyeVisualization />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
