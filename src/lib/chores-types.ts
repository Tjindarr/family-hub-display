// ── Chore System Types ──

export interface Kid {
  id: string;
  name: string;
  avatar: string; // emoji or image URL (starts with "/" for image)
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
  category?: string; // category tag
  deadline?: string; // HH:MM deadline time
  earlyBonus?: number; // bonus points for completing before deadline
  rotationKids?: string[]; // kid IDs for auto-rotation assignment
}

export interface ChoreLog {
  id: string;
  choreId: string;
  kidId: string;
  completedAt: string; // ISO
  photoUrl?: string;
  approved: boolean;
  approvedAt?: string;
  undoneAt?: string; // if undone
  bonusMultiplier?: number; // applied bonus day multiplier
  earlyBonusEarned?: number; // early completion bonus points earned
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

// ── Chore Submissions (kid-initiated) ──
export interface ChoreSubmission {
  id: string;
  kidId: string;
  title: string;
  note?: string;
  photoUrl?: string;
  points: number;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface BulkTemplate {
  id: string;
  name: string;
  chores: Omit<Chore, "id" | "createdAt">[];
}

// ── Bonus Days ──
export interface BonusDay {
  id: string;
  dayOfWeek: number; // 0=Sun…6=Sat, or -1 for specific date
  date?: string; // ISO date for one-off bonus days
  multiplier: number; // e.g. 2 for double points
  label: string; // e.g. "Double Point Saturday"
}

// ── Weekly Challenges ──
export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetType: "chores_count" | "points_earned" | "early_completions" | "categories_covered";
  targetValue: number;
  bonusPoints: number;
  weekStart: string; // ISO date of the Monday this challenge starts
  completedBy: string[]; // kid IDs who completed it
}

// ── Streak Protection ──
export interface StreakProtection {
  id: string;
  kidId: string;
  date: string; // ISO date of the protected day
  reason: string; // e.g. "Sick", "Vacation"
}

// ── Leveling ──
export interface LevelDefinition {
  name: string;
  icon: string;
  minPoints: number;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { name: "Beginner", icon: "🌱", minPoints: 0 },
  { name: "Helper", icon: "🤝", minPoints: 50 },
  { name: "Worker", icon: "⚒️", minPoints: 150 },
  { name: "Pro", icon: "⭐", minPoints: 350 },
  { name: "Expert", icon: "💎", minPoints: 700 },
  { name: "Master", icon: "👑", minPoints: 1500 },
  { name: "Legend", icon: "🏆", minPoints: 3000 },
];

export function getKidLevel(totalPoints: number): LevelDefinition & { level: number; nextLevel?: LevelDefinition; progress: number } {
  let current = LEVEL_DEFINITIONS[0];
  let level = 1;
  for (let i = 1; i < LEVEL_DEFINITIONS.length; i++) {
    if (totalPoints >= LEVEL_DEFINITIONS[i].minPoints) {
      current = LEVEL_DEFINITIONS[i];
      level = i + 1;
    }
  }
  const nextLevel = level < LEVEL_DEFINITIONS.length ? LEVEL_DEFINITIONS[level] : undefined;
  const progress = nextLevel
    ? ((totalPoints - current.minPoints) / (nextLevel.minPoints - current.minPoints)) * 100
    : 100;
  return { ...current, level, nextLevel, progress };
}

// ── Chore Settings ──
export interface ChoreSettings {
  rotationEnabled: boolean;
  showSuggestions: boolean;
  categories: string[];
  bonusDays: BonusDay[];
}

export interface ChoresData {
  kids: Kid[];
  chores: Chore[];
  logs: ChoreLog[];
  badges: Badge[];
  kidBadges: KidBadge[];
  rewards: Reward[];
  rewardClaims: RewardClaim[];
  settings: ChoreSettings;
  challenges: WeeklyChallenge[];
  streakProtections: StreakProtection[];
  submissions: ChoreSubmission[];
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

export const DEFAULT_SETTINGS: ChoreSettings = {
  rotationEnabled: false,
  showSuggestions: true,
  categories: ["Kitchen", "Bedroom", "Bathroom", "Outdoor", "General"],
  bonusDays: [],
};

export const EMPTY_CHORES_DATA: ChoresData = {
  kids: [],
  chores: [],
  logs: [],
  badges: [...DEFAULT_BADGES],
  kidBadges: [],
  rewards: [],
  rewardClaims: [],
  settings: { ...DEFAULT_SETTINGS },
  challenges: [],
  streakProtections: [],
  submissions: [],
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
  anytime: "🕐 Anytime",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Check if today is a bonus day */
export function getTodayBonusMultiplier(bonusDays: BonusDay[]): { multiplier: number; label: string } | null {
  const now = new Date();
  const todayDay = now.getDay();
  const todayStr = now.toISOString().split("T")[0];

  for (const bd of bonusDays) {
    if (bd.date && bd.date === todayStr) return { multiplier: bd.multiplier, label: bd.label };
    if (bd.dayOfWeek >= 0 && bd.dayOfWeek === todayDay) return { multiplier: bd.multiplier, label: bd.label };
  }
  return null;
}

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
      return choreLogs.length === 0;

    case "daily":
      return !lastDay || lastDay.getTime() < today.getTime();

    case "interval": {
      if (!lastDay) return true;
      const daysSince = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);
      return daysSince >= (chore.recurrence.intervalDays ?? 1);
    }

    case "weekly":
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

/** Get kid's streak (consecutive days with at least one chore), considering streak protections */
export function getKidStreak(kidId: string, logs: ChoreLog[], protections?: StreakProtection[]): number {
  const kidLogs = logs.filter((l) => l.kidId === kidId && !l.undoneAt);
  if (kidLogs.length === 0) return 0;

  const protectedDates = new Set(
    (protections || []).filter((p) => p.kidId === kidId).map((p) => {
      const d = new Date(p.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

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
    if (dates.has(key) || protectedDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    // Allow today to not have chores yet (don't break on day 0)
  }

  return streak;
}

/** Get total points for a kid (including bonuses) */
export function getKidTotalPoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt)
    .reduce((sum, l) => {
      const basePoints = choreMap.get(l.choreId)?.points ?? 0;
      const multiplier = l.bonusMultiplier || 1;
      const earlyBonus = l.earlyBonusEarned || 0;
      return sum + (basePoints * multiplier) + earlyBonus;
    }, 0);
}

/** Get weekly points for a kid */
export function getKidWeeklyPoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt && new Date(l.completedAt) >= weekAgo)
    .reduce((sum, l) => {
      const basePoints = choreMap.get(l.choreId)?.points ?? 0;
      const multiplier = l.bonusMultiplier || 1;
      const earlyBonus = l.earlyBonusEarned || 0;
      return sum + (basePoints * multiplier) + earlyBonus;
    }, 0);
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

/** Suggest which kid should do a chore based on fairness or rotation */
export function suggestFairKid(choreId: string, kids: Kid[], logs: ChoreLog[], rotationKids?: string[], rotationEnabled?: boolean): Kid | null {
  if (kids.length === 0) return null;

  // If rotation is enabled and this chore has rotation kids
  if (rotationEnabled && rotationKids && rotationKids.length > 0) {
    const rotKids = kids.filter((k) => rotationKids.includes(k.id));
    if (rotKids.length > 0) {
      const choreLogs = logs.filter((l) => l.choreId === choreId && !l.undoneAt)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      const lastKidId = choreLogs[0]?.kidId;
      if (!lastKidId) return rotKids[0];
      const lastIdx = rotKids.findIndex((k) => k.id === lastKidId);
      return rotKids[(lastIdx + 1) % rotKids.length];
    }
  }

  // Default fairness-based suggestion
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

/** Check challenge progress for a kid this week */
export function getChallengeProgress(challenge: WeeklyChallenge, kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const weekStart = new Date(challenge.weekStart);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekLogs = logs.filter(
    (l) => l.kidId === kidId && !l.undoneAt &&
      new Date(l.completedAt) >= weekStart && new Date(l.completedAt) < weekEnd
  );

  switch (challenge.targetType) {
    case "chores_count":
      return weekLogs.length;
    case "points_earned": {
      const choreMap = new Map(chores.map((c) => [c.id, c]));
      return weekLogs.reduce((s, l) => {
        const base = choreMap.get(l.choreId)?.points ?? 0;
        return s + (base * (l.bonusMultiplier || 1)) + (l.earlyBonusEarned || 0);
      }, 0);
    }
    case "early_completions":
      return weekLogs.filter((l) => (l.earlyBonusEarned || 0) > 0).length;
    case "categories_covered": {
      const choreMap = new Map(chores.map((c) => [c.id, c]));
      const cats = new Set(weekLogs.map((l) => choreMap.get(l.choreId)?.category).filter(Boolean));
      return cats.size;
    }
    default:
      return 0;
  }
}

/** Generate weekly challenges */
export function generateWeeklyChallenges(): Omit<WeeklyChallenge, "id" | "weekStart" | "completedBy">[] {
  const pool: Omit<WeeklyChallenge, "id" | "weekStart" | "completedBy">[] = [
    { title: "Chore Machine", description: "Complete 10 chores this week", icon: "⚡", targetType: "chores_count", targetValue: 10, bonusPoints: 20 },
    { title: "Early Bird", description: "Complete 3 chores before deadline", icon: "🐦", targetType: "early_completions", targetValue: 3, bonusPoints: 15 },
    { title: "Point Hunter", description: "Earn 30 points this week", icon: "🎯", targetType: "points_earned", targetValue: 30, bonusPoints: 10 },
    { title: "Explorer", description: "Do chores in 3 different categories", icon: "🗺️", targetType: "categories_covered", targetValue: 3, bonusPoints: 15 },
    { title: "Super Helper", description: "Complete 15 chores this week", icon: "🦸", targetType: "chores_count", targetValue: 15, bonusPoints: 30 },
    { title: "Score Big", description: "Earn 50 points this week", icon: "💰", targetType: "points_earned", targetValue: 50, bonusPoints: 20 },
  ];
  // Pick 2 random challenges
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}
