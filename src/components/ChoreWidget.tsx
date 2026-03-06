import { useChoresData } from "@/hooks/useChoresData";
import type { Kid, Chore } from "@/lib/chores-types";
import type { ChoreWidgetConfig } from "@/lib/config";
import { isChoreDueToday, isChoreCompletedToday, isChoreCompletedInCycle, daysUntilDue, suggestFairKid } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { UrgencyDot } from "@/components/chores/UrgencyDot";
import { ChoreWidgetUpcoming } from "@/components/chores/ChoreWidgetUpcoming";
import { ChoreWidgetCompletedEntry } from "@/components/chores/ChoreWidgetCompletedEntry";
import { ChoreWidgetScoreboard } from "@/components/chores/ChoreWidgetScoreboard";

interface Props {
  config?: ChoreWidgetConfig;
}

export default function ChoreWidget({ config }: Props) {
  const { data, loading } = useChoresData(10000);
  const navigate = useNavigate();

  const label = config?.label || "Chores";
  const icon = config?.icon || "mdi:clipboard-check-outline";
  const showScoreboard = config?.showScoreboard ?? true;
  const showUpcoming = config?.showUpcoming ?? true;
  const showFairness = (config?.showFairness ?? true) && (data.settings?.showSuggestions ?? true);
  const showCompleted = config?.showCompleted ?? true;
  const showAllChores = config?.showAllChores ?? false;
  const maxVisible = config?.maxVisible || 0;
  const headingColor = config?.headingColor;
  const headingSize = config?.headingSize;
  const choreTextColor = config?.choreTextColor;
  const choreTextSize = config?.choreTextSize;
  const urgencyDotSize = config?.urgencyDotSize || 8;
  const avatarSize = config?.avatarSize || 16;
  const ptsTextSize = config?.ptsTextSize;
  const ptsTextColor = config?.ptsTextColor;

  if (loading || data.chores.length === 0) return null;

  const activeChores = data.chores.filter((c) => !c.paused);
  const dueToday = activeChores.filter((c) => {
    if (isChoreDueToday(c, data.logs)) return true;
    if (c.perKid) {
      return data.kids.some((k: Kid) => !!isChoreCompletedInCycle(c, data.logs, k.id));
    }
    return false;
  });
  const completedToday = dueToday.filter((c) => {
    if (c.perKid) return data.kids.every((k: Kid) => isChoreCompletedInCycle(c, data.logs, k.id));
    return isChoreCompletedToday(c.id, data.logs);
  });
  const pendingToday = dueToday.length - completedToday.length;

  const isFullyCompleted = (c: Chore) => {
    if (c.perKid) return data.kids.every((k: Kid) => isChoreCompletedInCycle(c, data.logs, k.id));
    return !!isChoreCompletedToday(c.id, data.logs);
  };

  let visibleChores: Chore[];
  if (showAllChores) {
    visibleChores = showCompleted ? activeChores : activeChores.filter((c) => !isFullyCompleted(c));
  } else {
    visibleChores = showCompleted ? dueToday : dueToday.filter((c) => !isFullyCompleted(c));
  }
  if (maxVisible > 0) visibleChores = visibleChores.slice(0, maxVisible);

  const dueTodayIds = new Set(dueToday.map((c) => c.id));
  const upcoming = showUpcoming
    ? activeChores
        .filter((c) => !dueTodayIds.has(c.id))
        .map((c) => ({ chore: c, days: daysUntilDue(c, data.logs) }))
        .filter((x) => x.days !== null && x.days > 0)
        .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
        .slice(0, 3) as { chore: Chore; days: number }[]
    : [];

  return (
    <Card
      className="widget-card cursor-pointer hover:border-primary/40 transition-all h-full flex flex-col"
      onClick={() => navigate("/parent")}
    >
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle
          className="font-medium uppercase tracking-wider flex items-center gap-1.5"
          style={{
            color: headingColor || "hsl(var(--muted-foreground))",
            fontSize: headingSize ? `${headingSize}px` : "0.75rem",
          }}
        >
          <Icon icon={icon} className="w-3.5 h-3.5" />
          {label}
          {pendingToday > 0 && (
            <span className="ml-auto" style={{ color: "hsl(45 90% 50%)" }}>{pendingToday} pending</span>
          )}
          {pendingToday === 0 && dueToday.length > 0 && (
            <span className="ml-auto text-primary">All done ✅</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex-1 flex flex-col">
        {/* Pending chores */}
        <div className="space-y-1">
          {visibleChores.filter((c) => !isFullyCompleted(c)).map((chore) => {
            const log = isChoreCompletedToday(chore.id, data.logs);
            const kid = log ? data.kids.find((k: Kid) => k.id === log.kidId) : null;
            const fairKid = showFairness && !log ? suggestFairKid(chore.id, data.kids, data.logs, chore.rotationKids, data.settings?.rotationEnabled) : null;

            const pendingKids = chore.perKid
              ? data.kids.filter((k: Kid) => !isChoreCompletedInCycle(chore, data.logs, k.id))
              : null;
            const doneKids = chore.perKid
              ? data.kids.filter((k: Kid) => !!isChoreCompletedInCycle(chore, data.logs, k.id))
              : null;

            return (
              <div key={chore.id} className="flex items-center gap-2" style={{ fontSize: choreTextSize ? `${choreTextSize}px` : "0.875rem" }}>
                <span className="text-base">{chore.icon}</span>
                <span className="flex-1 truncate" style={{ color: choreTextColor || undefined }}>
                  {chore.title}
                </span>
                {chore.perKid ? (
                  <span className="flex items-center gap-0.5">
                    {doneKids?.map((k) => (
                      <span key={k.id} className="relative opacity-50">
                        <KidAvatar kid={k} size={avatarSize - 2} />
                        <span className="absolute -bottom-0.5 -right-0.5 text-primary" style={{ fontSize: `${Math.max(8, (avatarSize - 2) * 0.6)}px`, lineHeight: 1 }}>✓</span>
                      </span>
                    ))}
                    {pendingKids?.map((k) => (
                      <span key={k.id}>
                        <KidAvatar kid={k} size={avatarSize - 2} />
                      </span>
                    ))}
                  </span>
                ) : kid ? (
                  <span className="text-xs flex items-center gap-1" style={{ color: kid.color, fontSize: ptsTextSize ? `${ptsTextSize}px` : undefined }}>
                    <KidAvatar kid={kid} size={avatarSize} /> {kid.name}
                  </span>
                ) : fairKid ? (
                  <span className="text-xs flex items-center gap-1" style={{ color: fairKid.color, opacity: 0.6, fontSize: ptsTextSize ? `${ptsTextSize}px` : undefined }}>
                    <KidAvatar kid={fairKid} size={avatarSize - 2} /> {fairKid.name}?
                  </span>
                ) : (
                  <UrgencyDot days={0} size={urgencyDotSize} />
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming */}
        <ChoreWidgetUpcoming
          upcoming={upcoming}
          kids={data.kids}
          logs={data.logs}
          avatarSize={avatarSize}
          choreTextSize={choreTextSize}
          urgencyDotSize={urgencyDotSize}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Completed */}
        {showCompleted && (() => {
          const completedChores = visibleChores.filter((c) => {
            if (c.perKid) return data.kids.some((k: Kid) => !!isChoreCompletedInCycle(c, data.logs, k.id));
            return isFullyCompleted(c);
          });
          if (completedChores.length === 0) return null;
          return (
            <div className="space-y-1 mt-2 pt-2 border-t border-border">
              {completedChores.map((chore) => (
                <ChoreWidgetCompletedEntry
                  key={chore.id}
                  chore={chore}
                  kids={data.kids}
                  logs={data.logs}
                  avatarSize={avatarSize}
                  choreTextSize={choreTextSize}
                  choreTextColor={choreTextColor}
                />
              ))}
            </div>
          );
        })()}

        {/* Scoreboard */}
        {showScoreboard && (
          <ChoreWidgetScoreboard
            kids={data.kids}
            logs={data.logs}
            chores={data.chores}
            avatarSize={avatarSize}
            ptsTextSize={ptsTextSize}
            ptsTextColor={ptsTextColor}
          />
        )}
      </CardContent>
    </Card>
  );
}
