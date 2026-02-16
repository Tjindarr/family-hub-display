import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import type { HACalendarEvent } from "@/lib/config";

interface EnrichedCalendarEvent extends HACalendarEvent {
  _prefix?: string;
  _color?: string;
}

interface CalendarWidgetProps {
  events: EnrichedCalendarEvent[];
  loading: boolean;
}

function getEventTime(event: HACalendarEvent): Date {
  const dt = event.start.dateTime || event.start.date || "";
  return parseISO(dt);
}

function formatEventTime(event: HACalendarEvent): string {
  const start = getEventTime(event);
  if (event.start.date && !event.start.dateTime) return "All day";
  return format(start, "HH:mm");
}

function getDayLabel(event: HACalendarEvent): string {
  const date = getEventTime(event);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, yyyy-MM-dd");
}

export default function CalendarWidget({ events, loading }: CalendarWidgetProps) {
  // Group by day
  const grouped = events.reduce<Record<string, EnrichedCalendarEvent[]>>((acc, event) => {
    const label = getDayLabel(event);
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {});

  return (
    <div className="widget-card h-full flex flex-col">

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary/70">
                {day}
              </p>
              <div className="space-y-2">
                {dayEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatEventTime(event)}
                      </span>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: event._color || undefined }}
                    >
                      {event._prefix ? `${event._prefix} ` : ""}
                      {event.summary}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
