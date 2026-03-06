export function UrgencyDot({ days, size = 8 }: { days: number; size?: number }) {
  const color = days === 0
    ? "hsl(0 72% 55%)"
    : days <= 1
    ? "hsl(45 90% 50%)"
    : "hsl(120 50% 50%)";
  return <span className="rounded-full inline-block" style={{ backgroundColor: color, width: size, height: size }} />;
}
