import { useState, useRef } from "react";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Kid, Chore, ChoreLog, Reward, TimeOfDay } from "@/lib/chores-types";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, TIME_OF_DAY_LABELS,
} from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Undo2, Camera, Trophy, Gift, Flame, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function KidsPage() {
  const { data, refresh } = useChoresData(3000);
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [showRewards, setShowRewards] = useState(false);
  const [captureLogId, setCaptureLogId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If no kid selected, show kid picker
  if (!selectedKid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h1 className="text-2xl font-bold mb-2">👋 Who are you?</h1>
          <p className="text-muted-foreground mb-8">Tap your name to see your chores</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {data.kids.map((kid) => (
              <button
                key={kid.id}
                onClick={() => setSelectedKid(kid)}
                className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all active:scale-95"
              >
                <KidAvatar kid={kid} size={64} />
                <span className="font-semibold text-lg" style={{ color: kid.color }}>{kid.name}</span>
              </button>
            ))}
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
  const streak = getKidStreak(kid.id, data.logs);
  const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
  const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);

  // Get due chores grouped by time of day
  const dueChores = data.chores.filter((c) => isChoreDueToday(c, data.logs));
  const completedToday = data.chores
    .map((c) => ({ chore: c, log: isChoreCompletedToday(c.id, data.logs) }))
    .filter((x) => x.log && x.log.kidId === kid.id);

  const groupOrder: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];
  const grouped = groupOrder.map((tod) => ({
    key: tod,
    label: TIME_OF_DAY_LABELS[tod],
    chores: dueChores.filter((c) => c.timeOfDay === tod),
  })).filter((g) => g.chores.length > 0);

  const handleComplete = async (chore: Chore) => {
    if (chore.requirePhoto) {
      // Open file picker
      setCaptureLogId(chore.id);
      fileInputRef.current?.click();
      return;
    }
    try {
      await choresApi.completeChore(chore.id, kid.id);
      refresh();
      toast.success(`✅ ${chore.title} done! +${chore.points}pts`);
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

  // Find next reward progress
  const nextReward = (data.rewards || []).sort((a: Reward, b: Reward) => a.pointsCost - b.pointsCost).find((r: Reward) => r.pointsCost > available) || null;

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
            <Button variant="ghost" size="icon" onClick={() => setSelectedKid(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-2xl">{kid.avatar}</div>
            <div className="flex-1">
              <div className="font-semibold" style={{ color: kid.color }}>{kid.name}</div>
              <div className="text-xs text-muted-foreground">{dueChores.length} chores today</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRewards(true)}>
              <Gift className="w-4 h-4 mr-1" /> Rewards
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
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
                const canUndo = completedByMe && (Date.now() - new Date(completed!.completedAt).getTime()) < 5 * 60 * 1000;

                return (
                  <Card key={chore.id} className={completedByMe ? "border-primary/30 bg-primary/5" : completedByOther ? "opacity-50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{chore.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{chore.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{chore.points}pts</span>
                            <span>{"⭐".repeat(chore.difficulty)}</span>
                            {chore.requirePhoto && <Camera className="w-3 h-3" />}
                          </div>
                          {completedByOther && otherKid && (
                            <div className="text-xs mt-1" style={{ color: otherKid.color }}>
                              Done by {otherKid.avatar} {otherKid.name}
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
                  <span className="text-xs text-muted-foreground">
                    {new Date(log!.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-xs text-primary">+{chore.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
