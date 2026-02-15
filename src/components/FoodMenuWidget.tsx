import { format, isToday, isTomorrow, parseISO, addDays } from "date-fns";
import { UtensilsCrossed } from "lucide-react";
import type { HACalendarEvent } from "@/lib/config";

export interface FoodMenuEvent {
  summary: string;
  date: string; // YYYY-MM-DD
  description?: string;
}

interface FoodMenuWidgetProps {
  events: FoodMenuEvent[];
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

export default function FoodMenuWidget({ events, loading }: FoodMenuWidgetProps) {
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
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meals planned</p>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {events.map((event, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <div className="shrink-0 w-16">
                <span className="text-xs font-medium text-primary/80">{getDayLabel(event.date)}</span>
                <span className="block text-[10px] text-muted-foreground">{getShortDate(event.date)}</span>
              </div>
              <span className="text-sm font-medium text-foreground truncate">{event.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
