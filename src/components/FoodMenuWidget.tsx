import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { UtensilsCrossed } from "lucide-react";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

export interface FoodMenuDay {
  date: string;
  meals: string[];
}

interface FoodMenuWidgetProps {
  days: FoodMenuDay[];
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
}

function getDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE");
}

function getShortDate(dateStr: string): string {
  return format(parseISO(dateStr), "d/M");
}

export default function FoodMenuWidget({ days, loading, fontSizes }: FoodMenuWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  return (
    <div className="widget-card h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <span className="font-medium uppercase tracking-wider text-primary/70" style={{ fontSize: fs.heading }}>Menu</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="text-muted-foreground" style={{ fontSize: fs.body }}>No meals planned</p>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {days.map((day, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <div className="shrink-0 w-16 pt-0.5">
                <span className="font-medium text-primary/80" style={{ fontSize: fs.heading }}>{getDayLabel(day.date)}</span>
                <span className="block text-muted-foreground" style={{ fontSize: fs.label }}>{getShortDate(day.date)}</span>
              </div>
              <div className="flex-1 min-w-0">
                {day.meals.map((meal, j) => (
                  <span key={j} className="font-medium text-foreground block truncate" style={{ fontSize: fs.body }}>
                    {meal}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
