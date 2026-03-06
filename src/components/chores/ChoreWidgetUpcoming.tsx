import type { Kid, Chore, ChoreLog } from "@/lib/chores-types";
import { daysUntilDue } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { UrgencyDot } from "./UrgencyDot";

interface UpcomingItem {
  chore: Chore;
  days: number;
}

interface Props {
  upcoming: UpcomingItem[];
  kids: Kid[];
  logs: ChoreLog[];
  avatarSize: number;
  choreTextSize?: number;
  urgencyDotSize: number;
}

export function ChoreWidgetUpcoming({ upcoming, kids, logs, avatarSize, choreTextSize, urgencyDotSize }: Props) {
  if (upcoming.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border">
      {upcoming.map(({ chore, days }) => {
        const choreLogs = logs
          .filter((l) => l.choreId === chore.id && !l.undoneAt)
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        let lastKids: Kid[] = [];
        if (chore.perKid) {
          const seen = new Set<string>();
          for (const log of choreLogs) {
            if (!seen.has(log.kidId)) {
              seen.add(log.kidId);
              const kid = kids.find((k) => k.id === log.kidId);
              if (kid) lastKids.push(kid);
            }
            if (seen.size >= kids.length) break;
          }
        } else {
          const lastLog = choreLogs[0];
          if (lastLog) {
            const kid = kids.find((k) => k.id === lastLog.kidId);
            if (kid) lastKids = [kid];
          }
        }

        return (
          <div key={chore.id} className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: choreTextSize ? `${choreTextSize}px` : "0.875rem" }}>
            <span className="text-base">{chore.icon}</span>
            <span className="flex-1 truncate">{chore.title}</span>
            {lastKids.length > 0 && (
              <span className="flex items-center gap-0.5">
                {lastKids.map((k) => (
                  <span key={k.id} className="opacity-60">
                    <KidAvatar kid={k} size={avatarSize - 2} />
                  </span>
                ))}
              </span>
            )}
            <UrgencyDot days={days ?? 99} size={urgencyDotSize} />
            <span className="text-xs">{days}d</span>
          </div>
        );
      })}
    </div>
  );
}
