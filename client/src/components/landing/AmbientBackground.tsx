import { useEffect, useRef } from "react";

const AmbientBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      opacity: number;
      fadeDirection: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = canvas.parentElement?.scrollHeight || window.innerHeight;
    };

    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedY: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.15 + 0.05,
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
      };
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 25000);
      for (let i = 0; i < Math.min(particleCount, 80); i++) {
        particles.push(createParticle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Subtle gold/amber shimmer
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        gradient.addColorStop(0, `rgba(212, 175, 55, ${particle.opacity})`);
        gradient.addColorStop(0.5, `rgba(184, 134, 11, ${particle.opacity * 0.5})`);
        gradient.addColorStop(1, "rgba(184, 134, 11, 0)");

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Move particle downward slowly
        particle.y += particle.speedY;

        // Fade in and out
        particle.opacity += particle.fadeDirection * 0.002;
        if (particle.opacity >= 0.2) {
          particle.fadeDirection = -1;
        } else if (particle.opacity <= 0.03) {
          particle.fadeDirection = 1;
        }

        // Reset if particle goes below canvas
        if (particle.y > canvas.height + 10) {
          particle.y = -10;
          particle.x = Math.random() * canvas.width;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    initParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default AmbientBackground;
