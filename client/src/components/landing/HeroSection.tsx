import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const scrollToContent = () => {
    document.getElementById("problem")?.scrollIntoView({
      behavior: "smooth"
    });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />

      {/* Vignette Effect */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 100%)',
        opacity: 0.4
      }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="animate-fade-up opacity-0" style={{
            animationDelay: '100ms',
            animationFillMode: 'forwards'
          }}>
          </div>

          {/* Main Title */}
          <h1 className="animate-fade-up opacity-0 text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight" style={{
            animationDelay: '200ms',
            animationFillMode: 'forwards'
          }}>
            <span className="text-gradient-primary">NeuroLens</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up opacity-0 text-xl md:text-2xl lg:text-3xl font-light text-white/90 max-w-3xl mx-auto leading-relaxed" style={{
            animationDelay: '400ms',
            animationFillMode: 'forwards'
          }}>
            AI-powered retinal imaging for{" "}
            <span className="font-medium text-primary">early stroke risk prediction</span>
          </p>

          {/* Punch Line */}
          <p className="animate-fade-up opacity-0 text-lg md:text-xl text-gray-400 italic" style={{
            animationDelay: '500ms',
            animationFillMode: 'forwards'
          }}>
            "The eye as a window to brain health."
          </p>

          {/* CTAs */}
          <div className="animate-fade-up opacity-0 flex flex-col sm:flex-row gap-4 justify-center pt-4" style={{
            animationDelay: '600ms',
            animationFillMode: 'forwards'
          }}>
            <Button size="lg" onClick={scrollToContent} className="text-lg px-8 py-6 font-semibold glow-primary bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300">
              Explore Platform
            </Button>
            <Link to="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 font-medium border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 text-white">
                Access Platform
              </Button>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="animate-fade-up opacity-0 pt-8" style={{
            animationDelay: '800ms',
            animationFillMode: 'forwards'
          }}>
            <button onClick={scrollToContent} className="flex flex-col items-center gap-2 text-gray-400 hover:text-primary transition-colors mx-auto">
              <span className="text-sm font-medium">Scroll to explore</span>
              <ChevronDown className="w-6 h-6 animate-bounce" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
