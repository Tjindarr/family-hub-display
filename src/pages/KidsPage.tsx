import { useState, useRef } from "react";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Kid, Chore, ChoreLog, Reward, TimeOfDay, WeeklyChallenge, ChoreSubmission } from "@/lib/chores-types";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, TIME_OF_DAY_LABELS, getKidLevel,
  getTodayBonusMultiplier, getChallengeProgress,
} from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Undo2, Camera, Trophy, Gift, Flame, Star, ArrowLeft, Zap, Clock, Send, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KidsPage() {
  const { data, refresh } = useChoresData(3000);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(
    () => localStorage.getItem("chores_selected_kid")
  );

  const selectKid = (kid: Kid | null) => {
    setSelectedKidId(kid?.id ?? null);
    if (kid) {
      localStorage.setItem("chores_selected_kid", kid.id);
    } else {
      localStorage.removeItem("chores_selected_kid");
    }
  };

  const selectedKid = selectedKidId ? data.kids.find((k) => k.id === selectedKidId) || null : null;
  const [showRewards, setShowRewards] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [captureLogId, setCaptureLogId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitPhotoRef = useRef<HTMLInputElement>(null);

  // If no kid selected, show kid picker
  if (!selectedKid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h1 className="text-2xl font-bold mb-2">👋 Who are you?</h1>
          <p className="text-muted-foreground mb-8">Tap your name to see your chores</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {data.kids.map((kid) => {
              const total = getKidTotalPoints(kid.id, data.logs, data.chores);
              const level = getKidLevel(total);
              return (
                <button
                  key={kid.id}
                  onClick={() => selectKid(kid)}
                  className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all active:scale-95"
                >
                  <KidAvatar kid={kid} size={64} />
                  <span className="font-semibold text-lg" style={{ color: kid.color }}>{kid.name}</span>
                  <span className="text-xs text-muted-foreground">{level.icon} {level.name}</span>
                </button>
              );
            })}
          </div>
          {data.kids.length === 0 && (
            <p className="text-muted-foreground text-sm mt-8">No kids added yet. Ask a parent to set up the system.</p>
          )}
        </div>
      </div>
    );
  }

  const kid = selectedKid;
  const totalPoints = getKidTotalPoints(kid.id, data.logs, data.chores);
  const weeklyPoints = getKidWeeklyPoints(kid.id, data.logs, data.chores);
  const streak = getKidStreak(kid.id, data.logs, data.streakProtections);
  const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
  const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);
  const level = getKidLevel(totalPoints);
  const bonus = getTodayBonusMultiplier(data.settings?.bonusDays || []);

  // Get due chores grouped by time of day
  const dueChores = data.chores.filter((c) => isChoreDueToday(c, data.logs));
  const completedToday = data.chores
    .map((c) => ({ chore: c, log: isChoreCompletedToday(c.id, data.logs) }))
    .filter((x) => x.log && x.log.kidId === kid.id);

  // Current challenges
  const now = new Date();
  const currentChallenges = (data.challenges || []).filter((c: WeeklyChallenge) => {
    const ws = new Date(c.weekStart);
    const we = new Date(ws.getTime() + 7 * 86400000);
    return now >= ws && now < we;
  });

  const groupOrder: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];
  const grouped = groupOrder.map((tod) => ({
    key: tod,
    label: TIME_OF_DAY_LABELS[tod],
    chores: dueChores.filter((c) => c.timeOfDay === tod),
  })).filter((g) => g.chores.length > 0);

  const handleComplete = async (chore: Chore) => {
    if (chore.requirePhoto) {
      setCaptureLogId(chore.id);
      fileInputRef.current?.click();
      return;
    }
    try {
      await choresApi.completeChore(chore.id, kid.id);
      refresh();
      const bonusText = bonus ? ` (${bonus.multiplier}x bonus!)` : "";
      const earlyText = chore.deadline ? (() => {
        const [dh, dm] = chore.deadline!.split(":").map(Number);
        const deadlineMin = dh * 60 + dm;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        return nowMin <= deadlineMin && chore.earlyBonus ? ` +${chore.earlyBonus} early bonus!` : "";
      })() : "";
      toast.success(`✅ ${chore.title} done! +${chore.points}pts${bonusText}${earlyText}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !captureLogId) return;
    try {
      const photoUrl = await choresApi.uploadPhoto(file);
      await choresApi.completeChore(captureLogId, kid.id, photoUrl);
      refresh();
      toast.success("✅ Done with photo!");
    } catch (err: any) {
      toast.error(err.message);
    }
    setCaptureLogId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUndo = async (logId: string) => {
    try {
      await choresApi.undoChore(logId);
      refresh();
      toast.success("Undone!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClaimReward = async (reward: Reward) => {
    try {
      await choresApi.claimReward(reward.id, kid.id);
      refresh();
      toast.success(`🎉 Claimed ${reward.title}!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const nextReward = (data.rewards || []).sort((a: Reward, b: Reward) => a.pointsCost - b.pointsCost).find((r: Reward) => r.pointsCost > available) || null;

  // Submit chore view
  if (showSubmit) {
    return <SubmitChoreView kid={kid} onBack={() => setShowSubmit(false)} refresh={refresh} submitPhotoRef={submitPhotoRef} />;
  }

  // Challenges view
  if (showChallenges) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowChallenges(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">⚡ Challenges</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {currentChallenges.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No active challenges this week</p>
          )}
          {currentChallenges.map((challenge: WeeklyChallenge) => {
            const progress = getChallengeProgress(challenge, kid.id, data.logs, data.chores);
            const completed = challenge.completedBy?.includes(kid.id);
            const pct = Math.min(100, (progress / challenge.targetValue) * 100);
            return (
              <Card key={challenge.id} className={completed ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{challenge.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{challenge.title} {completed && "✅"}</div>
                      <div className="text-xs text-muted-foreground">{challenge.description}</div>
                      <div className="text-xs text-primary mt-1">+{challenge.bonusPoints} bonus points</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{progress}/{challenge.targetValue}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Rewards view
  if (showRewards) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowRewards(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">🎁 Rewards</h1>
            <div className="ml-auto text-sm font-medium text-primary">{available} pts available</div>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {(data.rewards || []).map((reward: Reward) => {
            const canAfford = available >= reward.pointsCost;
            return (
              <Card key={reward.id} className={!canAfford ? "opacity-50" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <span className="text-3xl">{reward.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{reward.title}</div>
                    <div className="text-sm text-muted-foreground">{reward.pointsCost} points</div>
                    {!canAfford && (
                      <Progress value={(available / reward.pointsCost) * 100} className="mt-2 h-2" />
                    )}
                  </div>
                  <Button size="sm" disabled={!canAfford} onClick={() => handleClaimReward(reward)}>
                    Claim
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {(data.rewards || []).length === 0 && (
            <p className="text-center text-muted-foreground">No rewards set up yet</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => selectKid(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <KidAvatar kid={kid} size={32} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: kid.color }}>{kid.name}</span>
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {level.icon} {level.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{dueChores.length} chores today</div>
            </div>
            <div className="flex gap-1">
              {currentChallenges.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowChallenges(true)}>
                  <Zap className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSubmit(true)}>
                <Send className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRewards(true)}>
                <Gift className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Bonus day banner */}
        {bonus && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3 text-center">
              <span className="text-sm font-medium text-yellow-400">🎉 {bonus.label} — All points are {bonus.multiplier}x today!</span>
            </CardContent>
          </Card>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{totalPoints}</div>
              <div className="text-xs text-muted-foreground">Total pts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{streak}</div>
              <div className="text-xs text-muted-foreground">Day streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{weeklyPoints}</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>
        </div>

        {/* Level progress */}
        {level.nextLevel && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span>{level.icon} {level.name}</span>
                <span className="text-muted-foreground">→</span>
                <span>{level.nextLevel.icon} {level.nextLevel.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{totalPoints}/{level.nextLevel.minPoints}</span>
              </div>
              <Progress value={level.progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((kb: any) => {
              const badge = data.badges.find((b: any) => b.id === kb.badgeId);
              return badge ? (
                <div key={kb.badgeId} className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-sm">
                  <span>{badge.icon}</span>
                  <span className="text-secondary-foreground">{badge.name}</span>
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Next reward progress */}
        {nextReward && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span>{nextReward.icon}</span>
                <span>Next: {nextReward.title}</span>
                <span className="ml-auto text-muted-foreground">{available}/{nextReward.pointsCost}</span>
              </div>
              <Progress value={(available / nextReward.pointsCost) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Active challenges preview */}
        {currentChallenges.length > 0 && (
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setShowChallenges(true)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-medium">Weekly Challenges</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {currentChallenges.filter((c: WeeklyChallenge) => c.completedBy?.includes(kid.id)).length}/{currentChallenges.length} done
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chore list grouped by time of day */}
        {grouped.map((group) => (
          <div key={group.key}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{group.label}</h3>
            <div className="space-y-2">
              {group.chores.map((chore) => {
                const completed = isChoreCompletedToday(chore.id, data.logs);
                const completedByMe = completed && completed.kidId === kid.id;
                const completedByOther = completed && completed.kidId !== kid.id;
                const otherKid = completedByOther ? data.kids.find((k: Kid) => k.id === completed!.kidId) : null;
                const canUndo = completedByMe;

                // Deadline info
                let deadlineInfo: { text: string; isUrgent: boolean; canEarnBonus: boolean } | null = null;
                if (chore.deadline && !completedByMe) {
                  const [dh, dm] = chore.deadline.split(":").map(Number);
                  const deadlineMin = dh * 60 + dm;
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const remaining = deadlineMin - nowMin;
                  const canEarnBonus = remaining > 0 && !!chore.earlyBonus;
                  deadlineInfo = {
                    text: remaining > 0 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m left` : "Past deadline",
                    isUrgent: remaining <= 30 && remaining > 0,
                    canEarnBonus,
                  };
                }

                return (
                  <Card key={chore.id} className={completedByMe ? "border-primary/30 bg-primary/5" : completedByOther ? "opacity-50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{chore.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{chore.title}</span>
                            {chore.category && (
                              <span className="text-[10px] bg-secondary px-1.5 rounded">{chore.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{chore.points}pts{bonus ? ` (${Math.round(chore.points * bonus.multiplier)}✨)` : ""}</span>
                            <span>{"⭐".repeat(chore.difficulty)}</span>
                            {chore.requirePhoto && <Camera className="w-3 h-3" />}
                          </div>
                          {deadlineInfo && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${deadlineInfo.isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" />
                              <span>{deadlineInfo.text}</span>
                              {deadlineInfo.canEarnBonus && (
                                <span className="text-primary font-medium">+{chore.earlyBonus} early bonus!</span>
                              )}
                            </div>
                          )}
                          {completedByOther && otherKid && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: otherKid.color }}>
                              Done by <KidAvatar kid={otherKid} size={14} /> {otherKid.name}
                            </div>
                          )}
                        </div>
                        {completedByMe ? (
                          <div className="flex items-center gap-2">
                            <div className="text-primary font-medium text-sm flex items-center gap-1">
                              <Check className="w-5 h-5" /> Done!
                            </div>
                            {canUndo && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUndo(completed!.id)}>
                                <Undo2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : completedByOther ? (
                          <Check className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Button
                            size="lg"
                            className="rounded-xl px-6"
                            onClick={() => handleComplete(chore)}
                          >
                            Done!
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {dueChores.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold mb-1">All done!</h2>
            <p className="text-muted-foreground">No chores due today. Enjoy your free time!</p>
          </div>
        )}

        {/* Completed by me today */}
        {completedToday.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">✅ Completed today</h3>
            <div className="space-y-1">
              {completedToday.map(({ chore, log }) => (
                <div key={log!.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-primary/5">
                  <span>{chore.icon}</span>
                  <span className="flex-1">{chore.title}</span>
                  {log!.bonusMultiplier && log!.bonusMultiplier > 1 && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1 rounded">{log!.bonusMultiplier}x</span>
                  )}
                  {log!.earlyBonusEarned && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">+{log!.earlyBonusEarned}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(log!.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-xs text-primary">+{chore.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My submissions */}
        {(() => {
          const mySubmissions = (data.submissions || []).filter(
            (s: ChoreSubmission) => s.kidId === kid.id && s.status !== "approved"
          ).sort((a: ChoreSubmission, b: ChoreSubmission) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          if (mySubmissions.length === 0) return null;
          return (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">📤 My Submissions</h3>
              <div className="space-y-2">
                {mySubmissions.map((sub: ChoreSubmission) => (
                  <Card key={sub.id} className={sub.status === "rejected" ? "border-destructive/30" : "border-yellow-500/30"}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Send className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{sub.title}</div>
                          {sub.note && <div className="text-xs text-muted-foreground">{sub.note}</div>}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sub.points}pts • {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {sub.status === "rejected" && (
                            <div className="text-xs text-destructive mt-1">
                              ❌ Rejected{sub.rejectionReason ? `: ${sub.rejectionReason}` : ""}
                            </div>
                          )}
                        </div>
                        {sub.photoUrl && (
                          <img src={sub.photoUrl} alt="Proof" className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${sub.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : "bg-destructive/20 text-destructive"}`}>
                          {sub.status === "pending" ? "⏳ Pending" : "Rejected"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Submit Chore View ──
function SubmitChoreView({ kid, onBack, refresh, submitPhotoRef }: {
  kid: Kid; onBack: () => void; refresh: () => void; submitPhotoRef: React.RefObject<HTMLInputElement>;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [points, setPoints] = useState(5);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await choresApi.uploadPhoto(file);
      setPhotoUrl(url);
    } catch {
      toast.error("Photo upload failed");
      setPhotoPreview("");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please describe what you did");
      return;
    }
    setSubmitting(true);
    try {
      await choresApi.submitChore({
        kidId: kid.id,
        title: title.trim(),
        note: note.trim() || undefined,
        photoUrl: photoUrl || undefined,
        points,
      });
      refresh();
      toast.success("📤 Submitted! Waiting for parent approval");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <input ref={submitPhotoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">📤 Submit a Chore</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">What did you do? *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cleaned the garage, Organized bookshelf..."
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Add a note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any extra details..."
                maxLength={500}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">How many points?</label>
              <div className="flex items-center gap-2">
                {[3, 5, 10, 15, 20].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPoints(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      points === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {p}pts
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Photo proof (optional)</label>
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                      <span className="text-xs">Uploading...</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setPhotoPreview(""); setPhotoUrl(""); }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => submitPhotoRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" /> Add Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!title.trim() || submitting || uploading}
          onClick={handleSubmit}
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit for Approval"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your parent will review and approve this chore. Points are awarded after approval.
        </p>
      </div>
    </div>
  );
}
