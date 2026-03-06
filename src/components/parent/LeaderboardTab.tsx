import { useState } from "react";
import type { Kid, Chore } from "@/lib/chores-types";
import {
  getKidChorePoints, getKidGradePoints, getKidWeeklyChorePoints,
  getKidWeeklyPoints, getKidStreak, getKidLevel,
  GRADE_LEVEL_DEFINITIONS,
} from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, ChevronDown } from "lucide-react";
import { choresApi } from "@/lib/chores-api";
import { toast } from "sonner";

export function LeaderboardTab({ data, refresh }: any) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const gradesEnabled = data.settings?.gradesEnabled ?? false;

  const kidStats = data.kids.map((kid: Kid) => {
    const chorePoints = getKidChorePoints(kid.id, data.logs, data.chores);
    const gradePoints = getKidGradePoints(kid.id, data.grades);
    const total = chorePoints + gradePoints;
    const weeklyChore = getKidWeeklyChorePoints(kid.id, data.logs, data.chores);
    const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores, data.grades);
    const streak = getKidStreak(kid.id, data.logs);
    const level = getKidLevel(chorePoints);
    const gradeLevel = gradesEnabled ? getKidLevel(gradePoints, GRADE_LEVEL_DEFINITIONS) : null;
    const choresDone = data.logs.filter((l: any) => l.kidId === kid.id && !l.undoneAt && !l.choreId.startsWith("grade_")).length;
    return { kid, total, weekly, weeklyChore, streak, level, gradeLevel, choresDone, chorePoints, gradePoints };
  }).sort((a: any, b: any) => b.total - a.total);

  const trophies = ["🥇", "🥈", "🥉"];

  const logs = [...data.logs]
    .filter((l: any) => !l.undoneAt)
    .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 50);

  return (
    <>
      <h2 className="text-xl font-semibold">🏆 Leaderboard</h2>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-base font-medium">📅 This Week</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {[...kidStats].sort((a: any, b: any) => b.weekly - a.weekly).map((stat: any, i: number) => (
            <div key={stat.kid.id} className="flex items-center gap-3 min-h-[44px]">
              <span className="text-xl w-8 text-center">{trophies[i] || `${i + 1}.`}</span>
              <KidAvatar kid={stat.kid} size={36} />
              <div className="flex-1">
                <span className="font-semibold text-base" style={{ color: stat.kid.color }}>{stat.kid.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-base">{stat.weeklyChore}</span>
                <span className="text-sm text-muted-foreground"> chore</span>
                {gradesEnabled && (
                  <>
                    <span className="text-sm text-muted-foreground"> + </span>
                    <span className="font-bold text-sm">{stat.weekly - stat.weeklyChore}</span>
                    <span className="text-sm text-muted-foreground"> grade</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-base font-medium">🏅 All-Time</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {kidStats.map((stat: any, i: number) => (
            <div key={stat.kid.id} className="flex items-center gap-3">
              <span className="text-xl w-8 text-center">{trophies[i] || `${i + 1}.`}</span>
              <KidAvatar kid={stat.kid} size={40} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base" style={{ color: stat.kid.color }}>{stat.kid.name}</span>
                  <span className="text-sm bg-secondary px-1.5 py-0.5 rounded">
                    {stat.level.icon} {stat.level.name}
                  </span>
                  {gradesEnabled && stat.gradeLevel && (
                    <span className="text-sm bg-secondary px-1.5 py-0.5 rounded">
                      {stat.gradeLevel.icon} {stat.gradeLevel.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[15px] text-muted-foreground mt-0.5">
                  <span>🏆 {stat.chorePoints}</span>
                  {gradesEnabled && stat.gradePoints > 0 && <span>📝 {stat.gradePoints}</span>}
                  <span>✅ {stat.choresDone}</span>
                  <span>🔥 {stat.streak}d</span>
                </div>
                {stat.level.nextLevel && (
                  <Progress value={stat.level.progress} className="h-1.5 mt-1.5" />
                )}
                {gradesEnabled && stat.gradeLevel?.nextLevel && (
                  <Progress value={stat.gradeLevel.progress} className="h-1.5 mt-1" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* History section */}
      <button
        className="w-full flex items-center justify-between py-3 text-lg font-semibold"
        onClick={() => setHistoryExpanded(!historyExpanded)}
      >
        <span>📜 Recent Activity</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${historyExpanded ? "rotate-180" : ""}`} />
      </button>

      {historyExpanded && (
        <>
          <div className="space-y-1">
            {logs.map((log: any) => {
              const chore = data.chores.find((c: Chore) => c.id === log.choreId);
              const kid = data.kids.find((k: Kid) => k.id === log.kidId);
              const isExpanded = expandedId === log.id;
              const completedDate = new Date(log.completedAt);

              return (
                <Card key={log.id} className={`transition-colors ${isExpanded ? "border-primary/30" : ""}`}>
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-2 text-[15px] cursor-pointer min-h-[52px]"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {!log.choreId?.startsWith("grade_") && <span className="text-lg">{chore?.icon}</span>}
                    <span className="flex-1 truncate font-medium text-base">{chore?.title}</span>
                    <span className="flex items-center gap-1 text-[15px] shrink-0" style={{ color: kid?.color }}>
                      {kid && <KidAvatar kid={kid} size={18} />}
                      <span className="hidden sm:inline">{kid?.name}</span>
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {completedDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    {log.photoUrl && <span className="text-sm shrink-0">📷</span>}
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[15px]">
                        <div>
                          <span className="text-muted-foreground text-sm">Completed</span>
                          <div className="font-medium">
                            {completedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                            {" "}
                            {completedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Points</span>
                          <div className="font-medium">
                            +{chore?.points || 0}pts
                            {log.bonusMultiplier && log.bonusMultiplier > 1 && (
                              <span className="ml-1 text-yellow-400">({log.bonusMultiplier}x)</span>
                            )}
                            {log.earlyBonusEarned && (
                              <span className="ml-1 text-primary">+{log.earlyBonusEarned}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Category</span>
                          <div className="font-medium">{chore?.category || "—"}</div>
                        </div>
                        {chore?.requireApproval && (
                          <div>
                            <span className="text-muted-foreground text-sm">Approval</span>
                            <div className="font-medium">{log.approved ? "✅ Approved" : "⏳ Pending"}</div>
                          </div>
                        )}
                        {chore?.requirePhoto && !log.photoUrl && (
                          <div>
                            <span className="text-muted-foreground text-sm">Photo</span>
                            <div className="font-medium">❌ Missing</div>
                          </div>
                        )}
                      </div>

                      {log.photoUrl && (
                        <div>
                          <span className="text-sm text-muted-foreground block mb-1">📷 Photo proof</span>
                          <img
                            src={log.photoUrl}
                            alt="Chore proof"
                            className="w-32 h-32 rounded-lg object-cover cursor-pointer border border-border hover:border-primary/50 transition-colors"
                            onClick={() => setLightboxPhoto(log.photoUrl)}
                          />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full h-12 text-sm text-destructive"
                        onClick={async () => {
                          await choresApi.deleteLog(log.id);
                          refresh();
                          toast.success("Log entry removed");
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Remove Entry
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
        </>
      )}
    </>
  );
}
