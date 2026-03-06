import { useState, useRef } from "react";
import type { Kid } from "@/lib/chores-types";
import {
  getKidChorePoints, getKidGradePoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, getKidLevel,
} from "@/lib/chores-types";
import { choresApi } from "@/lib/chores-api";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const KID_EMOJIS = ["👦", "👧", "🧒", "👶", "🐱", "🐶", "🦄", "🐻", "🦊", "🐰"];
const KID_COLORS = [
  "hsl(340 80% 55%)", "hsl(210 90% 56%)", "hsl(120 60% 45%)", "hsl(36 80% 55%)",
  "hsl(280 70% 55%)", "hsl(174 72% 50%)", "hsl(0 72% 55%)", "hsl(45 90% 50%)",
];

export function KidsTab({ data, refresh, showAdd, setShowAdd }: any) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👦");
  const [color, setColor] = useState(KID_COLORS[0]);
  const [useImage, setUseImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [expandedKidId, setExpandedKidId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await choresApi.uploadPhoto(file);
      setImageUrl(url);
      setAvatar(url);
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <h2 className="text-xl font-semibold">Kids ({data.kids.length})</h2>

      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-12 text-base" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm font-medium">Avatar</Label>
                <button
                  onClick={() => { setUseImage(!useImage); if (useImage) setAvatar("👦"); }}
                  className="text-sm text-primary hover:underline"
                >
                  {useImage ? "Use emoji" : "Use photo"}
                </button>
              </div>
              {useImage ? (
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-sm">
                      No img
                    </div>
                  )}
                  <Button variant="outline" className="h-12 text-sm" onClick={() => fileRef.current?.click()}>
                    Upload Photo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {KID_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setAvatar(e)}
                      className={`text-xl p-1.5 rounded min-w-[40px] min-h-[40px] flex items-center justify-center ${avatar === e ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Color</Label>
              <div className="flex gap-2 mt-1.5">
                {KID_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 h-12 text-base" onClick={async () => {
                if (!name.trim()) return;
                await choresApi.addKid({ name: name.trim(), avatar, color });
                setName(""); setShowAdd(false); setUseImage(false); setImageUrl(""); refresh();
                toast.success("Kid added");
              }}>Add Kid</Button>
              <Button variant="outline" className="h-12 px-4" onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {data.kids.map((kid: Kid) => {
          const chorePoints = getKidChorePoints(kid.id, data.logs, data.chores);
          const gradePoints = getKidGradePoints(kid.id, data.grades);
          const total = chorePoints + gradePoints;
          const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores, data.grades);
          const streak = getKidStreak(kid.id, data.logs);
          const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards, data.grades);
          const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);
          const level = getKidLevel(chorePoints);
          const isExpanded = expandedKidId === kid.id;

          return (
            <Card key={kid.id}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left min-h-[64px]"
                  onClick={() => setExpandedKidId(isExpanded ? null : kid.id)}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: kid.color + "33" }}>
                    <KidAvatar kid={kid} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base" style={{ color: kid.color }}>{kid.name}</span>
                      <span className="text-sm bg-secondary px-1.5 py-0.5 rounded">
                        {level.icon} {level.name}
                      </span>
                    </div>
                    <div className="text-[15px] text-muted-foreground mt-0.5">
                      🏆 {total}pts • 🔥 {streak}d • 💰 {available}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3 text-[15px] pt-3">
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-sm">Total Points</div>
                        <div className="font-bold text-lg">{total}</div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-sm">This Week</div>
                        <div className="font-bold text-lg">{weekly}</div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-sm">Streak</div>
                        <div className="font-bold text-lg">🔥 {streak}d</div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-sm">Available</div>
                        <div className="font-bold text-lg">💰 {available}</div>
                      </div>
                    </div>

                    {level.nextLevel && (
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                          <span>Next: {level.nextLevel.icon} {level.nextLevel.name} ({level.nextLevel.minPoints}pts)</span>
                        </div>
                        <Progress value={level.progress} className="h-2" />
                      </div>
                    )}

                    {badges.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {badges.map((kb: any) => {
                          const badge = data.badges.find((b: any) => b.id === kb.badgeId);
                          return badge ? (
                            <span key={kb.badgeId} title={badge.name} className="text-lg bg-secondary/50 rounded-lg px-2 py-1">{badge.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}

                    <Button variant="outline" className="w-full h-12 text-sm text-destructive" onClick={async () => {
                      await choresApi.deleteKid(kid.id);
                      refresh();
                      toast.success("Kid removed");
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove Kid
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!showAdd && (
        <Button variant="outline" className="w-full h-12 text-base" onClick={() => setShowAdd(true)}>
          <Plus className="w-5 h-5 mr-2" /> New Kid
        </Button>
      )}
    </>
  );
}
