import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { UtensilsCrossed } from "lucide-react";
import type { ResolvedFontSizes } from "@/lib/fontSizes";
import type { FoodMenuStyleConfig, FoodMenuDisplayMode } from "@/lib/config";

export interface FoodMenuDay {
  date: string;
  meals: string[];
}

interface FoodMenuWidgetProps {
  days: FoodMenuDay[];
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
  displayMode?: FoodMenuDisplayMode;
  style?: FoodMenuStyleConfig;
  showTitle?: boolean;
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

export default function FoodMenuWidget({ days, loading, fontSizes, displayMode, style, showTitle = true }: FoodMenuWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
  const mode = displayMode || "compact";
  const s = style || {} as Partial<FoodMenuStyleConfig>;

  const daySize = s.dayFontSize || fs.heading;
  const dateSize = s.dateFontSize || fs.label;
  const mealSize = s.mealFontSize || fs.body;
  const dayColor = s.dayColor || undefined;
  const dateColor = s.dateColor || undefined;
  const mealColor = s.mealColor || undefined;
  const dayFont = s.dayFont || undefined;
  const mealFont = s.mealFont || undefined;

  return (
    <div className="widget-card h-full flex flex-col">
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <span className="font-medium uppercase tracking-wider text-primary/70" style={{ fontSize: fs.heading }}>Menu</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="text-muted-foreground" style={{ fontSize: fs.body }}>No meals planned</p>
      ) : mode === "menu" ? (
        /* Restaurant / Menu Style */
        <div className="space-y-3 flex-1 overflow-y-auto">
          {days.map((day, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center justify-center gap-2 mb-1.5 border-b border-border/30 pb-1.5">
                <span
                  className="font-semibold uppercase tracking-wider text-primary/80"
                  style={{ fontSize: daySize, color: dayColor, fontFamily: dayFont }}
                >
                  {getDayLabel(day.date)}
                </span>
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: dateSize, color: dateColor }}
                >
                  {getShortDate(day.date)}
                </span>
              </div>
              <div className="space-y-0.5 text-center">
                {day.meals.map((meal, j) => (
                  <span
                    key={j}
                    className="block text-foreground"
                    style={{ fontSize: mealSize, color: mealColor, fontFamily: mealFont }}
                  >
                    {meal}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compact Style (default) */
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {days.map((day, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-0.5 py-0.5 transition-colors hover:bg-muted/60"
            >
              <div className="shrink-0 w-16 pt-0.5" style={{ marginRight: 15 }}>
                <span
                  className="font-medium text-primary/80"
                  style={{ fontSize: daySize, color: dayColor, fontFamily: dayFont }}
                >
                  {getDayLabel(day.date)}
                </span>
                <span
                  className="block text-muted-foreground"
                  style={{ fontSize: dateSize, color: dateColor }}
                >
                  {getShortDate(day.date)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {day.meals.map((meal, j) => (
                  <span
                    key={j}
                    className="font-medium text-foreground block truncate"
                    style={{ fontSize: mealSize, color: mealColor, fontFamily: mealFont }}
                  >
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
