import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  "hsl(45, 100%, 60%)",
  "hsl(330, 90%, 60%)",
  "hsl(200, 90%, 60%)",
  "hsl(120, 70%, 55%)",
  "hsl(280, 80%, 65%)",
  "hsl(15, 95%, 60%)",
];

function ParticleDot({ p }: { p: Particle }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rad = (p.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * p.velocity * 15;
    const dy = Math.sin(rad) * p.velocity * 15 - 40;

    el.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 120}px) rotate(${p.spin}deg)`, opacity: 0 },
      ],
      { duration: 1300, easing: "cubic-bezier(0.25,0,0.5,1)", fill: "forwards" }
    );
  }, [p]);

  return (
    <div
      ref={ref}
      className="absolute"
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: p.size,
        height: p.shape === "rect" ? p.size * 0.6 : p.size,
        backgroundColor: p.color,
        borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
      }}
    />
  );
}

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

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <ParticleDot key={p.id} p={p} />
      ))}
    </div>,
    document.body
  );
}
