import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { UtensilsCrossed } from "lucide-react";

export interface FoodMenuDay {
  date: string; // YYYY-MM-DD
  meals: string[];
}

interface FoodMenuWidgetProps {
  days: FoodMenuDay[];
  loading: boolean;
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

export default function FoodMenuWidget({ days, loading }: FoodMenuWidgetProps) {
  return (
    <div className="widget-card h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wider text-primary/70">Menu</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meals planned</p>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {days.map((day, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <div className="shrink-0 w-16 pt-0.5">
                <span className="text-xs font-medium text-primary/80">{getDayLabel(day.date)}</span>
                <span className="block text-[10px] text-muted-foreground">{getShortDate(day.date)}</span>
              </div>
              <div className="flex-1 min-w-0">
                {day.meals.map((meal, j) => (
                  <span key={j} className="text-sm font-medium text-foreground block truncate">
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
