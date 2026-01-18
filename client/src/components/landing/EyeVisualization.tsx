import { useState } from "react";
import eyeAnatomyImage from "@/assets/eye-anatomy.png";

interface AnatomyPart {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const anatomyParts: AnatomyPart[] = [
  { 
    id: "conjunctiva", 
    name: "Conjunctiva", 
    description: "Thin transparent membrane covering the sclera; assessed for vascular abnormalities indicating systemic conditions.",
    x: 8, y: 8, width: 18, height: 12
  },
  { 
    id: "choroid", 
    name: "Choroid", 
    description: "Vascular layer supplying oxygen to the retina; choroidal thickness changes correlate with cardiovascular health.",
    x: 72, y: 5, width: 18, height: 14
  },
  { 
    id: "ciliary-body", 
    name: "Ciliary Body", 
    description: "Produces aqueous humor and controls lens shape; dysfunction linked to glaucoma risk.",
    x: 28, y: 12, width: 20, height: 12
  },
  { 
    id: "iris", 
    name: "Iris", 
    description: "Controls pupil size and light entry; iris vessel patterns may indicate microvascular disease.",
    x: 5, y: 28, width: 12, height: 14
  },
  { 
    id: "retina", 
    name: "Retina", 
    description: "Neural tissue where light converts to signals; retinal vessel analysis reveals stroke and cardiovascular risk markers.",
    x: 75, y: 22, width: 18, height: 14
  },
  { 
    id: "lens", 
    name: "Lens", 
    description: "Focuses light onto retina; lens clarity assessment aids in cataract detection affecting image quality.",
    x: 5, y: 42, width: 12, height: 12
  },
  { 
    id: "macula", 
    name: "Macula", 
    description: "Central retinal region for sharp vision; macular changes indicate diabetic retinopathy and AMD progression.",
    x: 78, y: 38, width: 16, height: 12
  },
  { 
    id: "vitreous-body", 
    name: "Vitreous Body", 
    description: "Clear gel maintaining eye shape; floaters and opacities can affect retinal imaging accuracy.",
    x: 35, y: 38, width: 22, height: 16
  },
  { 
    id: "pupil", 
    name: "Pupil", 
    description: "Aperture controlling light entry; pupil responses indicate neurological function and autonomic health.",
    x: 5, y: 58, width: 12, height: 12
  },
  { 
    id: "anterior-chamber", 
    name: "Anterior Chamber", 
    description: "Fluid-filled space between cornea and iris; depth assessment critical for glaucoma screening.",
    x: 28, y: 68, width: 22, height: 12
  },
  { 
    id: "cornea", 
    name: "Cornea", 
    description: "Transparent front surface refracting light; corneal health affects optical clarity for retinal imaging.",
    x: 5, y: 72, width: 14, height: 12
  },
  { 
    id: "optic-nerve", 
    name: "Optic Nerve", 
    description: "Transmits visual signals to brain; optic nerve head analysis detects glaucoma and elevated intracranial pressure.",
    x: 72, y: 78, width: 18, height: 10
  },
  { 
    id: "optic-disc", 
    name: "Optic Disc", 
    description: "Where retinal vessels and nerve fibers exit; cup-to-disc ratio is key biomarker for glaucomatous damage.",
    x: 72, y: 88, width: 18, height: 10
  },
];

const EyeVisualization = () => {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; part: AnatomyPart } | null>(null);

  const handlePartHover = (part: AnatomyPart, event: React.MouseEvent) => {
    setHoveredPart(part.id);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ 
      x: rect.left + rect.width / 2, 
      y: rect.top, 
      part 
    });
  };

  const handlePartLeave = () => {
    setHoveredPart(null);
    setTooltip(null);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />
      
      {/* Container for image and interactive overlay */}
      <div className="relative w-full max-w-2xl animate-subtle-float">
        {/* Eye Anatomy Image */}
        <img 
          src={eyeAnatomyImage} 
          alt="Anatomical cross-section of the human eye showing cornea, lens, retina, vitreous body, and optic nerve"
          className="w-full h-auto"
          style={{ 
            filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.5))",
          }}
        />
        
        {/* Interactive overlay regions */}
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {anatomyParts.map((part) => (
            <rect
              key={part.id}
              x={part.x}
              y={part.y}
              width={part.width}
              height={part.height}
              fill={hoveredPart === part.id ? "rgba(56, 189, 248, 0.25)" : "transparent"}
              stroke={hoveredPart === part.id ? "rgba(56, 189, 248, 0.6)" : "transparent"}
              strokeWidth="0.5"
              rx="1"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={(e) => handlePartHover(part, e)}
              onMouseLeave={handlePartLeave}
            />
          ))}
        </svg>
      </div>
      
      {/* Tooltip */}
      {hoveredPart && tooltip && (
        <div
          className="fixed z-50 px-4 py-3 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y - 12 }}
        >
          <p className="text-sm font-semibold text-primary mb-1">{tooltip.part.name}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{tooltip.part.description}</p>
        </div>
      )}
      
      <style>{`
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-subtle-float {
          animation: subtleFloat 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default EyeVisualization;
