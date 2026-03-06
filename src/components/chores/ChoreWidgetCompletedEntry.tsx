import type { Kid, Chore } from "@/lib/chores-types";
import { isChoreCompletedInCycle } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";

interface Props {
  chore: Chore;
  kids: Kid[];
  logs: any[];
  avatarSize: number;
  choreTextSize?: number;
  choreTextColor?: string;
}

export function ChoreWidgetCompletedEntry({ chore, kids, logs, avatarSize, choreTextSize, choreTextColor }: Props) {
  const doneKids: Kid[] = [];

  if (chore.perKid) {
    for (const k of kids) {
      if (isChoreCompletedInCycle(chore, logs, k.id)) doneKids.push(k);
    }
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter(
      (l: any) => l.choreId === chore.id && !l.undoneAt && new Date(l.completedAt).getTime() >= today.getTime()
    );
    const seen = new Set<string>();
    for (const l of todayLogs) {
      if (!seen.has(l.kidId)) {
        seen.add(l.kidId);
        const kid = kids.find((k) => k.id === l.kidId);
        if (kid) doneKids.push(kid);
      }
    }
  }

  if (doneKids.length === 0) return null;

  return (
    <div className="flex items-center gap-2" style={{ fontSize: choreTextSize ? `${choreTextSize}px` : "0.875rem" }}>
      <span className="text-base">{chore.icon}</span>
      <span className="flex-1 truncate line-through" style={{ color: "hsl(var(--muted-foreground))" }}>
        {chore.title}
      </span>
      <span className="flex items-center gap-0.5">
        {doneKids.map((k) => (
          <span key={k.id} className="flex items-center gap-1" style={{ color: k.color }}>
            <KidAvatar kid={k} size={avatarSize - 2} />
          </span>
        ))}
      </span>
    </div>
  );
}
