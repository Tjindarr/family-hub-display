import { useChoresData } from "@/hooks/useChoresData";
import type { Kid, Chore } from "@/lib/chores-types";
import { isChoreDueToday, isChoreCompletedToday, daysUntilDue, getKidWeeklyPoints } from "@/lib/chores-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChoreWidget() {
  const { data, loading } = useChoresData(10000);
  const navigate = useNavigate();

  if (loading || data.chores.length === 0) return null;

  const activeChores = data.chores.filter((c) => !c.paused);
  const dueToday = activeChores.filter((c) => isChoreDueToday(c, data.logs));
  const completedToday = dueToday.filter((c) => isChoreCompletedToday(c.id, data.logs));
  const pendingToday = dueToday.length - completedToday.length;

  // Upcoming chores (not due today)
  const upcoming = activeChores
    .map((c) => ({ chore: c, days: daysUntilDue(c, data.logs) }))
    .filter((x) => x.days !== null && x.days > 0)
    .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
    .slice(0, 3);

  return (
    <Card
      className="widget-card cursor-pointer hover:border-primary/40 transition-all"
      onClick={() => navigate("/parent")}
    >
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" />
          Chores
          {pendingToday > 0 && (
            <span className="ml-auto text-yellow-500">{pendingToday} pending</span>
          )}
          {pendingToday === 0 && dueToday.length > 0 && (
            <span className="ml-auto text-primary">All done ✅</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Today's chores */}
        <div className="space-y-1">
          {dueToday.map((chore) => {
            const log = isChoreCompletedToday(chore.id, data.logs);
            const kid = log ? data.kids.find((k: Kid) => k.id === log.kidId) : null;
            return (
              <div key={chore.id} className="flex items-center gap-2 text-sm">
                <span className="text-base">{chore.icon}</span>
                <span className={`flex-1 truncate ${log ? "line-through text-muted-foreground" : ""}`}>
                  {chore.title}
                </span>
                {kid ? (
                  <span className="text-xs" style={{ color: kid.color }}>
                    {kid.avatar} {kid.name}
                  </span>
                ) : (
                  <UrgencyDot days={0} />
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            {upcoming.map(({ chore, days }) => (
              <div key={chore.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-base">{chore.icon}</span>
                <span className="flex-1 truncate">{chore.title}</span>
                <UrgencyDot days={days ?? 99} />
                <span className="text-xs">{days}d</span>
              </div>
            ))}
          </div>
        )}

        {/* Weekly scoreboard */}
        {data.kids.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-3 gap-y-1">
            {data.kids.map((kid: Kid) => {
              const pts = getKidWeeklyPoints(kid.id, data.logs, data.chores);
              return (
                <span key={kid.id} className="text-xs flex items-center gap-1">
                  <span>{kid.avatar}</span>
                  <span style={{ color: kid.color }}>{pts}pts</span>
                </span>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UrgencyDot({ days }: { days: number }) {
  const color = days === 0
    ? "hsl(0 72% 55%)"    // red — due today
    : days <= 1
    ? "hsl(45 90% 50%)"   // yellow — due tomorrow
    : "hsl(120 50% 50%)"; // green — not urgent
  return <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />;
}
