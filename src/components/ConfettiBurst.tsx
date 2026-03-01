import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  velocity: number;
  spin: number;
  shape: "circle" | "rect" | "star";
}

const COLORS = [
  "hsl(45, 100%, 60%)",   // gold
  "hsl(330, 90%, 60%)",   // pink
  "hsl(200, 90%, 60%)",   // blue
  "hsl(120, 70%, 55%)",   // green
  "hsl(280, 80%, 65%)",   // purple
  "hsl(15, 95%, 60%)",    // orange
];

export function ConfettiBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: Date.now() + i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 40 + (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      angle: Math.random() * 360,
      velocity: 3 + Math.random() * 6,
      spin: (Math.random() - 0.5) * 720,
      shape: (["circle", "rect", "star"] as const)[Math.floor(Math.random() * 3)],
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.velocity * 15;
        const dy = Math.sin(rad) * p.velocity * 15 - 40;
        return (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.shape === "rect" ? p.size * 0.6 : p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
              animation: `confetti-fall 1.3s cubic-bezier(0.25, 0, 0.5, 1) forwards`,
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
