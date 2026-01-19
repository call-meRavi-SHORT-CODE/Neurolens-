import { Camera, Settings, Brain, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Image Capture",
    description: "Retinal fundus image captured via smartphone attachment",
  },
  {
    icon: Settings,
    step: "02",
    title: "Preprocessing",
    description: "Image enhancement, noise reduction & vessel segmentation",
  },
  {
    icon: Brain,
    step: "03",
    title: "AI Analysis",
    description: "Deep learning extracts vascular features & biomarkers",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Risk Score",
    description: "Generates Low / Moderate / High stroke risk assessment",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-gradient-dark relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sky-400 font-semibold text-sm uppercase tracking-wider mb-4 block">
            The Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            How It <span className="bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-lg text-sky-100">
            A streamlined pipeline from image capture to actionable insights
          </p>
        </div>

        {/* Desktop Flow */}
        <div className="hidden lg:flex items-center justify-between max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div className="relative group">
                {/* Card */}
                <div className="w-64 p-6 rounded-2xl bg-gradient-card border-glow hover:glow-primary transition-all duration-500 text-center">
                  <div className="text-sky-400/30 text-5xl font-bold mb-4">{step.step}</div>
                  <div className="w-16 h-16 mx-auto rounded-xl bg-sky-500/10 flex items-center justify-center mb-4 group-hover:bg-sky-500/20 transition-colors">
                    <step.icon className="w-8 h-8 text-sky-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{step.title}</h3>
                  <p className="text-sm text-sky-100">{step.description}</p>
                </div>
              </div>
              
              {/* Arrow */}
              {index < steps.length - 1 && (
                <div className="mx-4 flex-shrink-0">
                  <ArrowRight className="w-8 h-8 text-sky-400/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile Flow */}
        <div className="lg:hidden space-y-6">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              <div className="flex gap-4 items-start">
                {/* Step Number Line */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                    {step.step}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-16 bg-sky-500/20 mt-2" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="p-5 rounded-xl bg-gradient-card border-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-sky-400" />
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm text-sky-100">{step.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
