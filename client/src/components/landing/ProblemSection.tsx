import { Brain, MapPin, DollarSign, Clock } from "lucide-react";

const problems = [
  {
    icon: Brain,
    title: "Stroke Burden",
    description: "India faces 1.8 million strokes annually, with 30% mortality rate",
  },
  {
    icon: MapPin,
    title: "Rural Healthcare Gap",
    description: "70% of population lacks access to neurological screening",
  },
  {
    icon: DollarSign,
    title: "High Costs",
    description: "Traditional MRI/CT scans cost ₹5,000-15,000 per screening",
  },
  {
    icon: Clock,
    title: "Late Detection",
    description: "Most strokes detected post-event, limiting prevention options",
  },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="py-24 lg:py-32 bg-gradient-dark relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-glow opacity-50" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sky-400 font-semibold text-sm uppercase tracking-wider mb-4 block">
            The Challenge
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Why This <span className="bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">Matters</span>
          </h2>
          <p className="text-lg text-sky-100">
            Stroke is a leading cause of death and disability worldwide. 
            Early detection can save lives, but current methods are expensive and inaccessible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div
              key={problem.title}
              className="group p-6 rounded-2xl bg-gradient-card border-glow hover:glow-primary transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center mb-5 group-hover:bg-sky-500/20 transition-colors">
                <problem.icon className="w-7 h-7 text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">{problem.title}</h3>
              <p className="text-sky-100 text-sm leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
