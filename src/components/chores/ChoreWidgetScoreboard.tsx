import type { Kid } from "@/lib/chores-types";
import { getKidWeeklyChorePoints } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import type { Chore, ChoreLog } from "@/lib/chores-types";

interface Props {
  kids: Kid[];
  logs: ChoreLog[];
  chores: Chore[];
  avatarSize: number;
  ptsTextSize?: number;
  ptsTextColor?: string;
}

export function ChoreWidgetScoreboard({ kids, logs, chores, avatarSize, ptsTextSize, ptsTextColor }: Props) {
  if (kids.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-3 gap-y-1">
      {kids.map((kid) => {
        const pts = getKidWeeklyChorePoints(kid.id, logs, chores);
        return (
          <span key={kid.id} className="text-xs flex items-center gap-2" style={{ fontSize: ptsTextSize ? `${ptsTextSize}px` : undefined }}>
            <KidAvatar kid={kid} size={avatarSize - 2} />
            <span style={{ color: ptsTextColor || kid.color }}>{pts}pts</span>
          </span>
        );
      })}
    </div>
  );
}
