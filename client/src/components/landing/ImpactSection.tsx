const stats = [
  {
    value: "75%",
    label: "Cost Reduction",
    description: "Compared to traditional MRI/CT screening",
  },
  {
    value: "85%+",
    label: "Target Accuracy",
    description: "AI-powered risk prediction precision",
  },
  {
    value: "< 30s",
    label: "Screening Time",
    description: "From image capture to risk score",
  },
  {
    value: "70%",
    label: "Rural Coverage",
    description: "Reaching underserved populations",
  },
];

const ImpactSection = () => {
  return (
    <section id="impact" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-glow opacity-30" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-sky-400 font-semibold text-sm uppercase tracking-wider mb-4 block">
            Our Impact
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Transforming <span className="bg-gradient-to-r from-white via-sky-300 to-cyan-400 bg-clip-text text-transparent">Healthcare</span>
          </h2>
          <p className="text-lg text-sky-100">
            Making stroke prevention accessible, affordable, and accurate for everyone
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative p-8 rounded-2xl bg-gradient-card border-glow hover:glow-primary transition-all duration-500 text-center overflow-hidden"
            >
              {/* Background Number */}
              <div className="absolute -top-4 -right-4 text-8xl font-bold text-sky-400/5 select-none">
                {stat.value}
              </div>
              
              <div className="relative z-10">
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent mb-3">
                  {stat.value}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{stat.label}</h3>
                <p className="text-sm text-sky-100">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Key Benefits */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Early Detection", desc: "Identify risk before symptoms appear" },
              { title: "Prevention Focus", desc: "Enable proactive healthcare interventions" },
              { title: "Life-Saving", desc: "Reduce stroke mortality through timely action" },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center p-6">
                <div className="w-3 h-3 rounded-full bg-sky-400 mx-auto mb-4" />
                <h4 className="font-semibold mb-2 text-white">{benefit.title}</h4>
                <p className="text-sm text-sky-100">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
