import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="widget-card flex items-center gap-4">
      <Clock className="h-5 w-5 text-primary animate-pulse-glow" />
      <div>
        <div className="stat-value text-foreground">
          {format(now, "HH:mm")}
          <span className="text-lg text-muted-foreground">:{format(now, "ss")}</span>
        </div>
        <p className="stat-label mt-0.5">
          {format(now, "EEEE, MMMM d, yyyy")}
        </p>
      </div>
    </div>
  );
}
