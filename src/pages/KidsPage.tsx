import { useState, useRef, useCallback } from "react";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Kid, Chore, ChoreLog, Reward, TimeOfDay, ChoreSubmission } from "@/lib/chores-types";
import { PhotoLightbox, PhotoThumbnail, PhotoIndicator } from "@/components/PhotoLightbox";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, TIME_OF_DAY_LABELS, getKidLevel,
  getStreakBonusMultiplier,
} from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Undo2, Camera, Trophy, Gift, Flame, Star, ArrowLeft, Clock, Send, Plus, X } from "lucide-react";
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
  
  const [showSubmit, setShowSubmit] = useState(false);
  const [captureLogId, setCaptureLogId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const fireConfetti = useCallback(() => setConfettiTrigger((t) => t + 1), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitPhotoRef = useRef<HTMLInputElement>(null);

  // If no kid selected, show kid picker
  if (!selectedKid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h1 className="text-4xl font-bold mb-3">👋 Who are you?</h1>
          <p className="text-muted-foreground text-xl mb-8">Tap your name to see your chores</p>
          <div className="grid grid-cols-2 gap-5 w-full max-w-md">
            {data.kids.map((kid) => {
              const total = getKidTotalPoints(kid.id, data.logs, data.chores);
              const level = getKidLevel(total);
              return (
                <button
                  key={kid.id}
                  onClick={() => selectKid(kid)}
                  className="flex flex-col items-center gap-3 p-7 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all active:scale-95"
                >
                  <KidAvatar kid={kid} size={72} />
                  <span className="font-semibold text-2xl" style={{ color: kid.color }}>{kid.name}</span>
                  <span className="text-base text-muted-foreground">{level.icon} {level.name}</span>
                </button>
              );
            })}
          </div>
          {data.kids.length === 0 && (
            <p className="text-muted-foreground text-lg mt-8">No kids added yet. Ask a parent to set up the system.</p>
          )}
        </div>
      </div>
    );
  }

  const kid = selectedKid;
  const totalPoints = getKidTotalPoints(kid.id, data.logs, data.chores);
  const weeklyPoints = getKidWeeklyPoints(kid.id, data.logs, data.chores);
  const streak = getKidStreak(kid.id, data.logs);
  const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
  const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);
  const level = getKidLevel(totalPoints);
  const streakBonus = getStreakBonusMultiplier(streak, data.settings?.streakBonuses || []);

  // Get due chores grouped by time of day
  const dueChores = data.chores.filter((c) => {
    if (c.perKid) return isChoreDueToday(c, data.logs.filter((l: any) => l.kidId === kid.id));
    return isChoreDueToday(c, data.logs);
  });
  const completedToday = data.chores
    .map((c) => ({ chore: c, log: isChoreCompletedToday(c.id, data.logs, kid.id) }))
    .filter((x) => x.log && x.log.kidId === kid.id);

  const now = new Date();
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
      const bonusText = streakBonus ? ` (${streakBonus.multiplier}x streak bonus!)` : "";
      const earlyText = chore.deadline ? (() => {
        const [dh, dm] = chore.deadline!.split(":").map(Number);
        const deadlineMin = dh * 60 + dm;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        return nowMin <= deadlineMin && chore.earlyBonus ? ` +${chore.earlyBonus} early bonus!` : "";
      })() : "";
      fireConfetti();
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
      fireConfetti();
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
    return (
      <>
        <ConfettiBurst trigger={confettiTrigger} />
        <SubmitChoreView kid={kid} onBack={() => setShowSubmit(false)} refresh={refresh} submitPhotoRef={submitPhotoRef} fireConfetti={fireConfetti} />
      </>
    );
  }


  // Rewards view
  if (showRewards) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowRewards(false)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-semibold">🎁 Rewards</h1>
            <div className="ml-auto text-base font-medium text-primary">{available} pts available</div>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {(data.rewards || []).map((reward: Reward) => {
            const canAfford = available >= reward.pointsCost;
            return (
              <Card key={reward.id} className={!canAfford ? "opacity-50" : ""}>
                <CardContent className="p-5 flex items-center gap-4">
                  <span className="text-4xl">{reward.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{reward.title}</div>
                    <div className="text-base text-muted-foreground">{reward.pointsCost} points</div>
                    {!canAfford && (
                      <Progress value={(available / reward.pointsCost) * 100} className="mt-2 h-2.5" />
                    )}
                  </div>
                  <Button disabled={!canAfford} onClick={() => handleClaimReward(reward)} className="text-base px-5 h-11">
                    Claim
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {(data.rewards || []).length === 0 && (
            <p className="text-center text-muted-foreground text-base">No rewards set up yet</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ConfettiBurst trigger={confettiTrigger} />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => selectKid(null)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <KidAvatar kid={kid} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg" style={{ color: kid.color }}>{kid.name}</span>
                <span className="text-sm bg-secondary px-2 py-0.5 rounded">
                  {level.icon} {level.name}
                </span>
              </div>
              <div className="text-base text-muted-foreground">{dueChores.length} chores today</div>
            </div>
            <div className="flex gap-2">
              <PushNotificationToggle role="kid" kidId={kid.id} compact />
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setShowSubmit(true)}>
                <Send className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setShowRewards(true)}>
                <Gift className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Streak bonus banner */}
        {streakBonus && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 text-center">
              <span className="text-base font-medium text-yellow-400">🔥 {streak}-day streak! All points are {streakBonus.multiplier}x!</span>
            </CardContent>
          </Card>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-1.5 text-yellow-500" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-sm text-muted-foreground">Total pts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 mx-auto mb-1.5 text-orange-500" />
              <div className="text-2xl font-bold">{streak}</div>
              <div className="text-sm text-muted-foreground">Day streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-1.5 text-primary" />
              <div className="text-2xl font-bold">{weeklyPoints}</div>
              <div className="text-sm text-muted-foreground">This week</div>
            </CardContent>
          </Card>
        </div>

        {/* Level progress */}
        {level.nextLevel && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-base mb-2">
                <span className="font-medium">{level.icon} {level.name}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{level.nextLevel.icon} {level.nextLevel.name}</span>
                <span className="ml-auto text-sm text-muted-foreground">{totalPoints}/{level.nextLevel.minPoints}</span>
              </div>
              <Progress value={level.progress} className="h-2.5" />
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((kb: any) => {
              const badge = data.badges.find((b: any) => b.id === kb.badgeId);
              return badge ? (
                <div key={kb.badgeId} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 text-base">
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
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-base mb-2">
                <span className="text-xl">{nextReward.icon}</span>
                <span className="font-medium">Next: {nextReward.title}</span>
                <span className="ml-auto text-sm text-muted-foreground">{available}/{nextReward.pointsCost}</span>
              </div>
              <Progress value={(available / nextReward.pointsCost) * 100} className="h-2.5" />
            </CardContent>
          </Card>
        )}


        {/* Chore list grouped by time of day */}
        {grouped.map((group) => (
          <div key={group.key}>
            <h3 className="text-lg font-semibold text-muted-foreground mb-3">{group.label}</h3>
            <div className="space-y-3">
              {group.chores.map((chore) => {
                const completed = chore.perKid
                  ? isChoreCompletedToday(chore.id, data.logs, kid.id)
                  : isChoreCompletedToday(chore.id, data.logs);
                const completedByMe = completed && completed.kidId === kid.id;
                const completedByOther = !chore.perKid && completed && completed.kidId !== kid.id;
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
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{chore.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg">{chore.title}</span>
                            {chore.category && (
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">{chore.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-base text-muted-foreground mt-1">
                            <span>{chore.points}pts{streakBonus ? ` (${Math.round(chore.points * streakBonus.multiplier)}✨)` : ""}</span>
                            <span>{"⭐".repeat(chore.difficulty)}</span>
                            {chore.requirePhoto && <Camera className="w-5 h-5" />}
                          </div>
                          {deadlineInfo && (
                            <div className={`flex items-center gap-1.5 text-base mt-1.5 ${deadlineInfo.isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
                              <Clock className="w-5 h-5" />
                              <span>{deadlineInfo.text}</span>
                              {deadlineInfo.canEarnBonus && (
                                <span className="text-primary font-medium">+{chore.earlyBonus} early bonus!</span>
                              )}
                            </div>
                          )}
                          {completedByOther && otherKid && (
                            <div className="flex items-center gap-1.5 text-base mt-1.5" style={{ color: otherKid.color }}>
                              Done by <KidAvatar kid={otherKid} size={20} /> {otherKid.name}
                            </div>
                          )}
                        </div>
                        {completedByMe ? (
                          <div className="flex items-center gap-2">
                            <div className="text-primary font-semibold text-lg flex items-center gap-1">
                              <Check className="w-7 h-7" /> Done!
                            </div>
                            {canUndo && (
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleUndo(completed!.id)}>
                                <Undo2 className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                        ) : completedByOther ? (
                          <Check className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Button
                            size="lg"
                            className="rounded-xl px-7 text-lg h-12 active:animate-celebrate-pop"
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
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-semibold mb-2">All done!</h2>
            <p className="text-muted-foreground text-lg">No chores due today. Enjoy your free time!</p>
          </div>
        )}

        {/* Completed by me today */}
        {completedToday.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-muted-foreground mb-3">✅ Completed today</h3>
            <div className="space-y-2">
              {completedToday.map(({ chore, log }) => (
                <div key={log!.id} className="flex items-center gap-3 text-base py-2.5 px-3 rounded-lg bg-primary/5">
                  <span className="text-xl">{chore.icon}</span>
                  <span className="flex-1 font-medium">{chore.title}</span>
                  {log!.bonusMultiplier && log!.bonusMultiplier > 1 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">{log!.bonusMultiplier}x</span>
                  )}
                  {log!.earlyBonusEarned && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">+{log!.earlyBonusEarned}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {new Date(log!.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {log!.photoUrl && <PhotoIndicator onClick={() => setLightboxPhoto(log!.photoUrl!)} />}
                  <span className="text-base font-medium text-primary">+{chore.points}</span>
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
              <h3 className="text-lg font-semibold text-muted-foreground mb-3">📤 My Submissions</h3>
              <div className="space-y-3">
                {mySubmissions.map((sub: ChoreSubmission) => (
                  <Card key={sub.id} className={sub.status === "rejected" ? "border-destructive/30" : "border-yellow-500/30"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg">{sub.title}</div>
                          {sub.note && <div className="text-base text-muted-foreground">{sub.note}</div>}
                          <div className="text-base text-muted-foreground mt-0.5">
                            {sub.points}pts • {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {sub.status === "rejected" && (
                            <div className="text-base text-destructive mt-1">
                              ❌ Rejected{sub.rejectionReason ? `: ${sub.rejectionReason}` : ""}
                            </div>
                          )}
                        </div>
                        {sub.photoUrl && (
                          <PhotoThumbnail src={sub.photoUrl} size="sm" onClick={() => setLightboxPhoto(sub.photoUrl!)} />
                        )}
                        <span className={`text-sm px-2.5 py-1 rounded font-medium ${sub.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : "bg-destructive/20 text-destructive"}`}>
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
      <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </div>
  );
}

// ── Submit Chore View ──

const QUICK_CHORES = [
  { emoji: "🧹", label: "Swept" },
  { emoji: "🧽", label: "Cleaned" },
  { emoji: "🗑️", label: "Trash" },
  { emoji: "🐕", label: "Pet care" },
  { emoji: "📚", label: "Tidied up" },
  { emoji: "🌱", label: "Gardening" },
  { emoji: "🍽️", label: "Dishes" },
  { emoji: "🧺", label: "Laundry" },
  { emoji: "🛏️", label: "Made bed" },
  { emoji: "🚗", label: "Car help" },
  { emoji: "📦", label: "Organized" },
  { emoji: "✨", label: "Other" },
];

const POINT_OPTIONS = [
  { value: 3, label: "3", emoji: "⭐" },
  { value: 5, label: "5", emoji: "⭐⭐" },
  { value: 10, label: "10", emoji: "🌟" },
  { value: 15, label: "15", emoji: "🌟🌟" },
  { value: 20, label: "20", emoji: "💎" },
];

function SubmitChoreView({ kid, onBack, refresh, submitPhotoRef, fireConfetti }: {
  kid: Kid; onBack: () => void; refresh: () => void; submitPhotoRef: React.RefObject<HTMLInputElement>; fireConfetti: () => void;
}) {
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [points, setPoints] = useState(5);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const title = selectedQuick === "✨" ? customTitle : selectedQuick ? QUICK_CHORES.find(q => q.emoji === selectedQuick)?.label || "" : "";
  const isCustom = selectedQuick === "✨";

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
    const finalTitle = isCustom ? customTitle.trim() : title;
    if (!finalTitle) {
      toast.error("Pick what you did!");
      return;
    }
    setSubmitting(true);
    try {
      await choresApi.submitChore({
        kidId: kid.id,
        title: finalTitle,
        photoUrl: photoUrl || undefined,
        points,
      });
      refresh();
      fireConfetti();
      toast.success("📤 Sent! Waiting for parent to approve");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <input ref={submitPhotoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold">What did you do?</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Step 1: Pick what you did */}
        <div>
          <p className="text-lg text-muted-foreground mb-3">Tap one:</p>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_CHORES.map((q) => (
              <button
                key={q.emoji}
                onClick={() => { setSelectedQuick(q.emoji); if (q.emoji !== "✨") setCustomTitle(""); }}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                  selectedQuick === q.emoji
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span className="text-4xl">{q.emoji}</span>
                <span className="text-sm font-medium text-foreground">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom title input - only shown for "Other" */}
        {isCustom && (
          <div>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Tell us what you did..."
              maxLength={200}
              className="h-14 text-lg rounded-xl"
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Points - only shown after selection */}
        {selectedQuick && (
          <div>
            <p className="text-lg text-muted-foreground mb-3">How many points?</p>
            <div className="flex gap-2 justify-center">
              {POINT_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPoints(p.value)}
                  className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all active:scale-95 min-w-[4rem] ${
                    points === p.value
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-lg font-bold text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo - optional, compact */}
        {selectedQuick && (
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
                    <span className="text-xs">...</span>
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
              <Button variant="outline" className="h-12 text-base rounded-xl" onClick={() => submitPhotoRef.current?.click()}>
                <Camera className="w-5 h-5 mr-2" /> Add photo
              </Button>
            )}
          </div>
        )}

        {/* Submit */}
        {selectedQuick && (
          <Button
            className="w-full text-xl h-14 rounded-xl"
            size="lg"
            disabled={(!title && !customTitle.trim()) || submitting || uploading}
            onClick={handleSubmit}
          >
            <Send className="w-6 h-6 mr-2" />
            {submitting ? "Sending..." : "Send to parent! 🚀"}
          </Button>
        )}

        <p className="text-sm text-center text-muted-foreground">
          A parent will check and give you the points ✨
        </p>
      </div>
    </div>
  );
}
