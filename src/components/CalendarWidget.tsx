import { format, isToday, isTomorrow, parseISO, getISOWeek } from "date-fns";
import { Clock } from "lucide-react";
import type { HACalendarEvent, CalendarDisplayConfig } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface EnrichedCalendarEvent extends HACalendarEvent {
  _prefix?: string;
  _color?: string;
}

interface CalendarWidgetProps {
  events: EnrichedCalendarEvent[];
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
  dayColor?: string;
  timeColor?: string;
  display?: CalendarDisplayConfig;
}

function getEventTime(event: HACalendarEvent): Date {
  const dt = event.start.dateTime || event.start.date || "";
  return parseISO(dt);
}

function formatEventTime(event: HACalendarEvent, display?: CalendarDisplayConfig): string {
  const isAllDay = event.start.date && !event.start.dateTime;
  if (isAllDay) return display?.hideAllDayText ? "" : "All day";

  const start = getEventTime(event);
  let time = format(start, "HH:mm");

  if (display?.showEndDate) {
    const endDt = event.end.dateTime || event.end.date || "";
    if (endDt) {
      const end = parseISO(endDt);
      time += ` – ${format(end, "HH:mm")}`;
    }
  }

  return time;
}

function getDayLabel(event: HACalendarEvent): string {
  const date = getEventTime(event);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, yyyy-MM-dd");
}

function getWeekNumber(event: HACalendarEvent): number {
  return getISOWeek(getEventTime(event));
}

export default function CalendarWidget({ events, loading, fontSizes, dayColor, timeColor, display }: CalendarWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  const fDay = display?.fontSizeDay || fs.heading;
  const fTime = display?.fontSizeTime || fs.label;
  const fTitle = display?.fontSizeTitle || fs.body;
  const fBody = display?.fontSizeBody || 12;

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
        <p style={{ fontSize: fTitle }} className="text-muted-foreground">No upcoming events</p>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium uppercase tracking-wider text-primary/70" style={{ fontSize: fDay, color: dayColor || undefined }}>
                  {day}
                </p>
                {display?.showWeekNumber && dayEvents.length > 0 && (
                  <span className="text-muted-foreground font-mono" style={{ fontSize: fTime }}>
                    W{getWeekNumber(dayEvents[0])}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dayEvents.map((event, i) => {
                  const timeStr = formatEventTime(event, display);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-0.5 py-0.5 transition-colors hover:bg-muted/60"
                    >
                      {timeStr && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground whitespace-nowrap" style={{ fontSize: fTime, color: timeColor || undefined }}>
                            {timeStr}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span
                          className="font-medium"
                          style={{ color: event._color || undefined, fontSize: fTitle }}
                        >
                          {event._prefix ? `${event._prefix} ` : ""}
                          {event.summary}
                        </span>
                        {display?.showEventBody && event.description && (
                          <span className="text-muted-foreground mt-0.5 line-clamp-2" style={{ fontSize: fBody }}>
                            {event.description}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
