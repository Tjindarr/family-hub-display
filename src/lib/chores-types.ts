// ── Chore System Types ──

export interface Kid {
  id: string;
  name: string;
  avatar: string; // emoji
  color: string; // HSL color string
}

export type RecurrenceType = "once" | "daily" | "interval" | "weekly";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export interface ChoreRecurrence {
  type: RecurrenceType;
  intervalDays?: number; // for "interval"
  weekdays?: number[]; // for "weekly" — 0=Sun, 1=Mon, …6=Sat
}

export interface Chore {
  id: string;
  title: string;
  icon: string; // emoji
  points: number;
  difficulty: number; // 1-5
  timeOfDay: TimeOfDay;
  recurrence: ChoreRecurrence;
  requirePhoto: boolean;
  requireApproval: boolean;
  paused: boolean;
  createdAt: string;
}

export interface ChoreLog {
  id: string;
  choreId: string;
  kidId: string;
  completedAt: string; // ISO
  photoUrl?: string;
  approved: boolean;
  approvedAt?: string;
  undoneAt?: string; // if undone within 5 min
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // emoji
  description: string;
  condition: BadgeCondition;
}

export type BadgeCondition =
  | { type: "total_chores"; value: number }
  | { type: "streak_days"; value: number }
  | { type: "total_points"; value: number };

export interface KidBadge {
  kidId: string;
  badgeId: string;
  earnedAt: string;
}

export interface Reward {
  id: string;
  title: string;
  icon: string; // emoji
  pointsCost: number;
}

export interface RewardClaim {
  id: string;
  kidId: string;
  rewardId: string;
  claimedAt: string;
}

export interface BulkTemplate {
  id: string;
  name: string;
  chores: Omit<Chore, "id" | "createdAt">[];
}

export interface ChoresData {
  kids: Kid[];
  chores: Chore[];
  logs: ChoreLog[];
  badges: Badge[];
  kidBadges: KidBadge[];
  rewards: Reward[];
  rewardClaims: RewardClaim[];
}

// ── Helpers ──

export const DEFAULT_BADGES: Badge[] = [
  { id: "first-chore", name: "First Chore!", icon: "⭐", description: "Completed your first chore", condition: { type: "total_chores", value: 1 } },
  { id: "ten-chores", name: "Getting Started", icon: "🔥", description: "Completed 10 chores", condition: { type: "total_chores", value: 10 } },
  { id: "fifty-chores", name: "Chore Champion", icon: "🏆", description: "Completed 50 chores", condition: { type: "total_chores", value: 50 } },
  { id: "hundred-chores", name: "Chore Legend", icon: "👑", description: "Completed 100 chores", condition: { type: "total_chores", value: 100 } },
  { id: "streak-3", name: "3-Day Streak", icon: "🔥", description: "Did chores 3 days in a row", condition: { type: "streak_days", value: 3 } },
  { id: "streak-7", name: "Weekly Warrior", icon: "💪", description: "Did chores 7 days in a row", condition: { type: "streak_days", value: 7 } },
  { id: "streak-30", name: "Monthly Master", icon: "🌟", description: "Did chores 30 days in a row", condition: { type: "streak_days", value: 30 } },
  { id: "points-100", name: "100 Points!", icon: "💯", description: "Earned 100 points total", condition: { type: "total_points", value: 100 } },
  { id: "points-500", name: "Point Pro", icon: "🎯", description: "Earned 500 points total", condition: { type: "total_points", value: 500 } },
];

export const EMPTY_CHORES_DATA: ChoresData = {
  kids: [],
  chores: [],
  logs: [],
  badges: [...DEFAULT_BADGES],
  kidBadges: [],
  rewards: [],
  rewardClaims: [],
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
  anytime: "🕐 Anytime",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Check if a chore is "due" today based on recurrence and logs */
export function isChoreDueToday(chore: Chore, logs: ChoreLog[]): boolean {
  if (chore.paused) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDay = now.getDay();

  // Get latest valid (not undone) log for this chore
  const choreLogs = logs
    .filter((l) => l.choreId === chore.id && !l.undoneAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const lastLog = choreLogs[0];
  const lastDate = lastLog ? new Date(lastLog.completedAt) : null;
  const lastDay = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()) : null;

  switch (chore.recurrence.type) {
    case "once":
      // Due if never completed
      return choreLogs.length === 0;

    case "daily":
      // Due if not completed today
      return !lastDay || lastDay.getTime() < today.getTime();

    case "interval": {
      if (!lastDay) return true;
      const daysSince = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);
      return daysSince >= (chore.recurrence.intervalDays ?? 1);
    }

    case "weekly":
      // Due if today is one of the weekdays AND not completed today
      if (!chore.recurrence.weekdays?.includes(todayDay)) return false;
      return !lastDay || lastDay.getTime() < today.getTime();

    default:
      return false;
  }
}

/** Check if a chore was completed today */
export function isChoreCompletedToday(choreId: string, logs: ChoreLog[]): ChoreLog | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    logs.find(
      (l) =>
        l.choreId === choreId &&
        !l.undoneAt &&
        new Date(l.completedAt).getTime() >= today.getTime()
    ) ?? null
  );
}

/** Calculate days until a chore is due */
export function daysUntilDue(chore: Chore, logs: ChoreLog[]): number | null {
  if (chore.paused) return null;
  if (chore.recurrence.type === "once") {
    const done = logs.some((l) => l.choreId === chore.id && !l.undoneAt);
    return done ? null : 0;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const choreLogs = logs
    .filter((l) => l.choreId === chore.id && !l.undoneAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const lastLog = choreLogs[0];
  if (!lastLog) return 0;

  const lastDate = new Date(lastLog.completedAt);
  const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

  if (chore.recurrence.type === "daily") {
    return lastDay.getTime() >= today.getTime() ? 1 : 0;
  }

  if (chore.recurrence.type === "interval") {
    const daysSince = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);
    const interval = chore.recurrence.intervalDays ?? 1;
    return Math.max(0, interval - daysSince);
  }

  if (chore.recurrence.type === "weekly") {
    const weekdays = chore.recurrence.weekdays ?? [];
    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(today.getTime() + i * 86400000);
      const checkDay = checkDate.getDay();
      if (weekdays.includes(checkDay)) {
        if (i === 0 && lastDay.getTime() >= today.getTime()) continue;
        return i;
      }
    }
  }

  return null;
}

/** Get kid's streak (consecutive days with at least one chore) */
export function getKidStreak(kidId: string, logs: ChoreLog[]): number {
  const kidLogs = logs.filter((l) => l.kidId === kidId && !l.undoneAt);
  if (kidLogs.length === 0) return 0;

  // Get unique dates
  const dates = new Set(
    kidLogs.map((l) => {
      const d = new Date(l.completedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 86400000);
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    // Allow today to not have chores yet (don't break on day 0)
  }

  return streak;
}

/** Get total points for a kid */
export function getKidTotalPoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt)
    .reduce((sum, l) => sum + (choreMap.get(l.choreId)?.points ?? 0), 0);
}

/** Get weekly points for a kid */
export function getKidWeeklyPoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt && new Date(l.completedAt) >= weekAgo)
    .reduce((sum, l) => sum + (choreMap.get(l.choreId)?.points ?? 0), 0);
}

/** Get spent points (redeemed rewards) */
export function getKidSpentPoints(kidId: string, claims: RewardClaim[], rewards: Reward[]): number {
  const rewardMap = new Map(rewards.map((r) => [r.id, r]));
  return claims
    .filter((c) => c.kidId === kidId)
    .reduce((sum, c) => sum + (rewardMap.get(c.rewardId)?.pointsCost ?? 0), 0);
}

/** Get available points (total - spent) */
export function getKidAvailablePoints(kidId: string, logs: ChoreLog[], chores: Chore[], claims: RewardClaim[], rewards: Reward[]): number {
  return getKidTotalPoints(kidId, logs, chores) - getKidSpentPoints(kidId, claims, rewards);
}

/** Suggest which kid should do a chore based on fairness */
export function suggestFairKid(choreId: string, kids: Kid[], logs: ChoreLog[]): Kid | null {
  if (kids.length === 0) return null;
  const counts = new Map<string, number>();
  kids.forEach((k) => counts.set(k.id, 0));
  logs
    .filter((l) => l.choreId === choreId && !l.undoneAt)
    .forEach((l) => counts.set(l.kidId, (counts.get(l.kidId) ?? 0) + 1));

  let minCount = Infinity;
  let fairKid: Kid | null = null;
  for (const kid of kids) {
    const count = counts.get(kid.id) ?? 0;
    if (count < minCount) {
      minCount = count;
      fairKid = kid;
    }
  }
  return fairKid;
}
