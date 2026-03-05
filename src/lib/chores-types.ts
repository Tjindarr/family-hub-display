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
  perKid?: boolean; // if true, each kid can complete independently
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

// ── School Grades ──
export type GradeType = "exam" | "term";

export interface GradeScaleEntry {
  label: string; // e.g. "A", "5", "MVG"
  pointsReward: number; // auto-award points
}

export interface Grade {
  id: string;
  kidId: string;
  type: GradeType;
  subject: string;
  grade: string; // the label from the scale
  term?: string; // e.g. "Fall 2026", "Q1"
  date: string; // ISO date
  pointsAwarded: number; // actual points given (may differ from auto if overridden)
  autoAwarded: boolean; // true if points were auto-awarded
  createdAt: string;
}

export interface GradeSubmission {
  id: string;
  kidId: string;
  type: GradeType;
  subject: string;
  grade: string;
  term?: string;
  date: string;
  photoUrl?: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  rejectionReason?: string;
  pointsAwarded?: number;
}

export interface BulkTemplate {
  id: string;
  name: string;
  chores: Omit<Chore, "id" | "createdAt">[];
}

// ── Streak Bonus Milestones ──
export interface StreakBonus {
  id: string;
  daysRequired: number; // e.g. 7
  multiplier: number; // e.g. 2 for 2x points
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
  categoriesEnabled: boolean;
  categories: string[];
  streakBonuses: StreakBonus[];
  gradesEnabled: boolean;
  gradeScale: GradeScaleEntry[];
  gradeSubjects: string[];
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
  submissions: ChoreSubmission[];
  grades: Grade[];
  gradeSubmissions: GradeSubmission[];
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

export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { label: "A", pointsReward: 50 },
  { label: "B", pointsReward: 30 },
  { label: "C", pointsReward: 15 },
  { label: "D", pointsReward: 5 },
  { label: "E", pointsReward: 0 },
  { label: "F", pointsReward: 0 },
];

export const DEFAULT_SUBJECTS: string[] = [
  "Math", "English", "Science", "History", "Geography", "Art", "Music", "PE", "Languages",
];

export const DEFAULT_SETTINGS: ChoreSettings = {
  rotationEnabled: false,
  showSuggestions: true,
  categoriesEnabled: false,
  categories: ["Kitchen", "Bedroom", "Bathroom", "Outdoor", "General"],
  streakBonuses: [],
  gradesEnabled: false,
  gradeScale: [...DEFAULT_GRADE_SCALE],
  gradeSubjects: [...DEFAULT_SUBJECTS],
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
  submissions: [],
  grades: [],
  gradeSubmissions: [],
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
  anytime: "🕐 Anytime",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Get the active streak bonus multiplier for a kid */
export function getStreakBonusMultiplier(streak: number, streakBonuses: StreakBonus[]): { multiplier: number; daysRequired: number } | null {
  if (!streakBonuses || streakBonuses.length === 0) return null;
  // Sort descending by daysRequired, pick the highest tier the kid qualifies for
  const sorted = [...streakBonuses].sort((a, b) => b.daysRequired - a.daysRequired);
  for (const sb of sorted) {
    if (streak >= sb.daysRequired) {
      return { multiplier: sb.multiplier, daysRequired: sb.daysRequired };
    }
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

/** Check if a chore was completed today (optionally for a specific kid) */
export function isChoreCompletedToday(choreId: string, logs: ChoreLog[], kidId?: string): ChoreLog | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    logs.find(
      (l) =>
        l.choreId === choreId &&
        !l.undoneAt &&
        new Date(l.completedAt).getTime() >= today.getTime() &&
        (kidId ? l.kidId === kidId : true)
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

/** Get total points for a kid (including bonuses) — chores + grades combined */
export function getKidTotalPoints(kidId: string, logs: ChoreLog[], chores: Chore[], grades?: Grade[]): number {
  return getKidChorePoints(kidId, logs, chores) + getKidGradePoints(kidId, grades);
}

/** Get chore-only points for a kid (excludes grade_ virtual chores) */
export function getKidChorePoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt && !l.choreId.startsWith("grade_"))
    .reduce((sum, l) => {
      const basePoints = choreMap.get(l.choreId)?.points ?? 0;
      const multiplier = l.bonusMultiplier || 1;
      const earlyBonus = l.earlyBonusEarned || 0;
      return sum + (basePoints * multiplier) + earlyBonus;
    }, 0);
}

/** Get grade-only points for a kid */
export function getKidGradePoints(kidId: string, grades?: Grade[]): number {
  if (!grades) return 0;
  return grades
    .filter((g) => g.kidId === kidId)
    .reduce((sum, g) => sum + (g.pointsAwarded || 0), 0);
}

/** Get weekly chore-only points for a kid */
export function getKidWeeklyChorePoints(kidId: string, logs: ChoreLog[], chores: Chore[]): number {
  const choreMap = new Map(chores.map((c) => [c.id, c]));
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return logs
    .filter((l) => l.kidId === kidId && !l.undoneAt && !l.choreId.startsWith("grade_") && new Date(l.completedAt) >= weekAgo)
    .reduce((sum, l) => {
      const basePoints = choreMap.get(l.choreId)?.points ?? 0;
      const multiplier = l.bonusMultiplier || 1;
      const earlyBonus = l.earlyBonusEarned || 0;
      return sum + (basePoints * multiplier) + earlyBonus;
    }, 0);
}

/** Get weekly points for a kid (chores + grades combined) */
export function getKidWeeklyPoints(kidId: string, logs: ChoreLog[], chores: Chore[], grades?: Grade[]): number {
  const choreWeekly = getKidWeeklyChorePoints(kidId, logs, chores);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const gradeWeekly = (grades || [])
    .filter((g) => g.kidId === kidId && new Date(g.date) >= weekAgo)
    .reduce((sum, g) => sum + (g.pointsAwarded || 0), 0);
  return choreWeekly + gradeWeekly;
}

/** Get spent points (redeemed rewards) */
export function getKidSpentPoints(kidId: string, claims: RewardClaim[], rewards: Reward[]): number {
  const rewardMap = new Map(rewards.map((r) => [r.id, r]));
  return claims
    .filter((c) => c.kidId === kidId)
    .reduce((sum, c) => sum + (rewardMap.get(c.rewardId)?.pointsCost ?? 0), 0);
}

/** Get available points (total - spent) — uses combined chore + grade points */
export function getKidAvailablePoints(kidId: string, logs: ChoreLog[], chores: Chore[], claims: RewardClaim[], rewards: Reward[], grades?: Grade[]): number {
  return getKidTotalPoints(kidId, logs, chores, grades) - getKidSpentPoints(kidId, claims, rewards);
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

