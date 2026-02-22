import { format, isToday, isTomorrow, parseISO, getISOWeek, getWeek } from "date-fns";
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
  timeFormat?: "24h" | "12h";
}

function getEventTime(event: HACalendarEvent): Date {
  const dt = event.start.dateTime || event.start.date || "";
  return parseISO(dt);
}

function formatEventTime(event: HACalendarEvent, display?: CalendarDisplayConfig, timeFormat?: "24h" | "12h"): string {
  const isAllDay = event.start.date && !event.start.dateTime;
  if (isAllDay) return display?.hideAllDayText ? "" : "All day";

  const timeFmt = timeFormat === "12h" ? "hh:mm a" : "HH:mm";
  const start = getEventTime(event);
  let time = format(start, timeFmt);

  if (display?.showEndDate) {
    const endDt = event.end.dateTime || event.end.date || "";
    if (endDt) {
      const end = parseISO(endDt);
      time += ` – ${format(end, timeFmt)}`;
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

function getWeekNumber(event: HACalendarEvent, firstDayOfWeek: 0 | 1 | 6 = 1): number {
  const date = getEventTime(event);
  if (firstDayOfWeek === 1) return getISOWeek(date);
  return getWeek(date, { weekStartsOn: firstDayOfWeek });
}

export default function CalendarWidget({ events, loading, fontSizes, dayColor, timeColor, display, timeFormat }: CalendarWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  const fDay = display?.fontSizeDay || fs.heading;
  const fTime = display?.fontSizeTime || fs.label;
  const fTitle = display?.fontSizeTitle || fs.body;
  const fBody = display?.fontSizeBody || 12;

  const firstDayOfWeek = display?.firstDayOfWeek ?? 1;

  // Group by day
  const grouped = events.reduce<Record<string, EnrichedCalendarEvent[]>>((acc, event) => {
    const label = getDayLabel(event);
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {});

  // Determine which day groups should show a week number:
  // Only "Today" and the first day of a new week (compared to the previous group)
  const dayEntries = Object.entries(grouped);
  const showWeekForDay = new Set<string>();
  if (display?.showWeekNumber && dayEntries.length > 0) {
    // Always show on the first day group (whether it's Today or not)
    showWeekForDay.add(dayEntries[0][0]);
    // Show when week number changes from the previous group
    let prevWeek = dayEntries[0][1].length > 0 ? getWeekNumber(dayEntries[0][1][0], firstDayOfWeek) : -1;
    for (let i = 1; i < dayEntries.length; i++) {
      const [day, dayEvents] = dayEntries[i];
      if (dayEvents.length > 0) {
        const wk = getWeekNumber(dayEvents[0], firstDayOfWeek);
        if (wk !== prevWeek) {
          showWeekForDay.add(day);
        }
        prevWeek = wk;
      }
    }
  }

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
          {dayEntries.map(([day, dayEvents]) => (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium uppercase tracking-wider text-primary/70" style={{ fontSize: fDay, color: dayColor || undefined }}>
                  {day}
                </p>
                {showWeekForDay.has(day) && dayEvents.length > 0 && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary font-semibold font-mono" style={{ fontSize: Math.max(fDay, fTime) }}>
                    W{getWeekNumber(dayEvents[0], firstDayOfWeek)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dayEvents.map((event, i) => {
                  const timeStr = formatEventTime(event, display, timeFormat);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-0.5 py-0.5 transition-colors hover:bg-muted/60"
                    >
                      {timeStr && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {!display?.hideClockIcon && <Clock className="h-3 w-3 text-muted-foreground" />}
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
