import { useState, useRef } from "react";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Chore, Kid, Reward, ChoreRecurrence, TimeOfDay, RecurrenceType } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, getKidSpentPoints, suggestFairKid,
  WEEKDAY_LABELS, TIME_OF_DAY_LABELS, daysUntilDue,
} from "@/lib/chores-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Edit, Check, X, Pause, Play, Shield, Star, Trophy, Gift, Users, ClipboardList, History, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["🧹", "🧽", "🍽️", "🛏️", "🗑️", "🐕", "🌿", "📚", "👕", "🚗", "🧺", "🪣", "✨", "🏠", "🍳"];
const KID_EMOJIS = ["👦", "👧", "🧒", "👶", "🐱", "🐶", "🦄", "🐻", "🦊", "🐰"];
const KID_COLORS = [
  "hsl(340 80% 55%)", "hsl(210 90% 56%)", "hsl(120 60% 45%)", "hsl(36 80% 55%)",
  "hsl(280 70% 55%)", "hsl(174 72% 50%)", "hsl(0 72% 55%)", "hsl(45 90% 50%)",
];

type Tab = "chores" | "kids" | "rewards" | "history" | "approvals";

export default function ParentPage() {
  const { data, refresh } = useChoresData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chores");
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Chores", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "kids", label: "Kids", icon: <Users className="w-4 h-4" /> },
    { id: "rewards", label: "Rewards", icon: <Gift className="w-4 h-4" /> },
    { id: "approvals", label: "Approvals", icon: <Shield className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <History className="w-4 h-4" /> },
  ];

  const pendingApprovals = data.logs.filter(
    (l) => !l.undoneAt && !l.approved && data.chores.find((c) => c.id === l.choreId)?.requireApproval
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Parent Dashboard</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[53px] z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "approvals" && pendingApprovals.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {tab === "chores" && (
          <ChoresTab
            data={data}
            refresh={refresh}
            showAdd={showAddChore}
            setShowAdd={setShowAddChore}
            editingChore={editingChore}
            setEditingChore={setEditingChore}
          />
        )}
        {tab === "kids" && (
          <KidsTab data={data} refresh={refresh} showAdd={showAddKid} setShowAdd={setShowAddKid} />
        )}
        {tab === "rewards" && (
          <RewardsTab data={data} refresh={refresh} showAdd={showAddReward} setShowAdd={setShowAddReward} />
        )}
        {tab === "approvals" && <ApprovalsTab data={data} refresh={refresh} />}
        {tab === "history" && <HistoryTab data={data} />}
      </div>
    </div>
  );
}

// ── Chores Tab ──
function ChoresTab({ data, refresh, showAdd, setShowAdd, editingChore, setEditingChore }: any) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Chores ({data.chores.length})</h2>
        <Button size="sm" onClick={() => { setEditingChore(null); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Chore
        </Button>
      </div>

      {(showAdd || editingChore) && (
        <ChoreForm
          chore={editingChore}
          onSave={async (chore) => {
            if (editingChore) {
              await choresApi.updateChore(editingChore.id, chore);
            } else {
              await choresApi.addChore(chore);
            }
            setShowAdd(false);
            setEditingChore(null);
            refresh();
            toast.success(editingChore ? "Chore updated" : "Chore added");
          }}
          onCancel={() => { setShowAdd(false); setEditingChore(null); }}
        />
      )}

      <div className="space-y-2">
        {data.chores.map((chore: Chore) => {
          const due = isChoreDueToday(chore, data.logs);
          const completed = isChoreCompletedToday(chore.id, data.logs);
          const kid = completed ? data.kids.find((k: Kid) => k.id === completed.kidId) : null;
          const fairKid = suggestFairKid(chore.id, data.kids, data.logs);
          const countdown = daysUntilDue(chore, data.logs);

          return (
            <Card key={chore.id} className={`${chore.paused ? "opacity-50" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{chore.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{chore.title}</span>
                      {chore.requirePhoto && <span title="Photo required" className="text-xs">📸</span>}
                      {chore.requireApproval && <Shield className="w-3 h-3 text-muted-foreground" />}
                      {chore.paused && <Pause className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{chore.points}pts</span>
                      <span>{"⭐".repeat(chore.difficulty)}</span>
                      <span>{TIME_OF_DAY_LABELS[chore.timeOfDay]}</span>
                      {countdown !== null && countdown > 0 && (
                        <span className="text-primary">Due in {countdown}d</span>
                      )}
                      {due && !completed && (
                        <span className="text-yellow-500 font-medium">Due today</span>
                      )}
                      {completed && kid && (
                        <span style={{ color: kid.color }}>✅ {kid.name}</span>
                      )}
                    </div>
                    {fairKid && !completed && due && (
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: fairKid.color }}>
                        Suggestion: <KidAvatar kid={fairKid} size={16} /> {fairKid.name}'s turn
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                      await choresApi.updateChore(chore.id, { paused: !chore.paused });
                      refresh();
                      toast.success(chore.paused ? "Chore resumed" : "Chore paused");
                    }}>
                      {chore.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingChore(chore)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                      await choresApi.deleteChore(chore.id);
                      refresh();
                      toast.success("Chore deleted");
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ── Chore Form ──
function ChoreForm({ chore, onSave, onCancel }: { chore?: Chore | null; onSave: (c: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(chore?.title ?? "");
  const [icon, setIcon] = useState(chore?.icon ?? "🧹");
  const [points, setPoints] = useState(chore?.points ?? 1);
  const [difficulty, setDifficulty] = useState(chore?.difficulty ?? 1);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(chore?.timeOfDay ?? "anytime");
  const [recType, setRecType] = useState<RecurrenceType>(chore?.recurrence.type ?? "daily");
  const [intervalDays, setIntervalDays] = useState(chore?.recurrence.intervalDays ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(chore?.recurrence.weekdays ?? [1]);
  const [requirePhoto, setRequirePhoto] = useState(chore?.requirePhoto ?? false);
  const [requireApproval, setRequireApproval] = useState(chore?.requireApproval ?? false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const recurrence: ChoreRecurrence = { type: recType };
    if (recType === "interval") recurrence.intervalDays = intervalDays;
    if (recType === "weekly") recurrence.weekdays = weekdays;
    onSave({
      title: title.trim(), icon, points, difficulty, timeOfDay,
      recurrence, requirePhoto, requireApproval, paused: chore?.paused ?? false,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-2">
          <div>
            <Label className="text-xs">Icon</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setIcon(e)}
                  className={`text-xl p-1 rounded ${icon === e ? "bg-primary/20 ring-1 ring-primary" : ""}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vacuum upstairs" className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Points</Label>
            <Input type="number" min={1} value={points} onChange={(e) => setPoints(+e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Difficulty</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className="text-lg">
                  {d <= difficulty ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Time of Day</Label>
          <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_OF_DAY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Recurrence</Label>
          <Select value={recType} onValueChange={(v) => setRecType(v as RecurrenceType)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="interval">Every X days</SelectItem>
              <SelectItem value="weekly">Weekly on days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recType === "interval" && (
          <div>
            <Label className="text-xs">Every how many days?</Label>
            <Input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(+e.target.value)} className="mt-1" />
          </div>
        )}

        {recType === "weekly" && (
          <div>
            <Label className="text-xs">Which days?</Label>
            <div className="flex gap-1 mt-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setWeekdays((w) => w.includes(i) ? w.filter((d) => d !== i) : [...w, i])}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    weekdays.includes(i) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={requirePhoto} onCheckedChange={setRequirePhoto} />
            <Label className="text-xs">Require photo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            <Label className="text-xs">Require approval</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1">
            <Check className="w-4 h-4 mr-1" /> {chore ? "Update" : "Add"} Chore
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Kids Tab ──
function KidsTab({ data, refresh, showAdd, setShowAdd }: any) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👦");
  const [color, setColor] = useState(KID_COLORS[0]);
  const [useImage, setUseImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
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
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Kids ({data.kids.length})</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Kid
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-xs">Avatar</Label>
                <button
                  onClick={() => { setUseImage(!useImage); if (useImage) setAvatar("👦"); }}
                  className="text-xs text-primary hover:underline"
                >
                  {useImage ? "Use emoji" : "Use photo"}
                </button>
              </div>
              {useImage ? (
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs">
                      No img
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    Upload Photo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {KID_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setAvatar(e)}
                      className={`text-xl p-1 rounded ${avatar === e ? "bg-primary/20 ring-1 ring-primary" : ""}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1 mt-1">
                {KID_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={async () => {
                if (!name.trim()) return;
                await choresApi.addKid({ name: name.trim(), avatar, color });
                setName(""); setShowAdd(false); setUseImage(false); setImageUrl(""); refresh();
                toast.success("Kid added");
              }}>Add</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {data.kids.map((kid: Kid) => {
          const total = getKidTotalPoints(kid.id, data.logs, data.chores);
          const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores);
          const streak = getKidStreak(kid.id, data.logs);
          const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
          const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);

          return (
            <Card key={kid.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: kid.color + "33" }}>
                    <KidAvatar kid={kid} size={48} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: kid.color }}>{kid.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>🏆 {total}pts</span>
                      <span>📅 {weekly}/week</span>
                      <span>🔥 {streak}d streak</span>
                      <span>💰 {available} avail</span>
                    </div>
                    {badges.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {badges.map((kb: any) => {
                          const badge = data.badges.find((b: any) => b.id === kb.badgeId);
                          return badge ? (
                            <span key={kb.badgeId} title={badge.name} className="text-sm">{badge.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                    await choresApi.deleteKid(kid.id);
                    refresh();
                    toast.success("Kid removed");
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ── Rewards Tab ──
function RewardsTab({ data, refresh, showAdd, setShowAdd }: any) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState(50);
  const REWARD_EMOJIS = ["🎁", "🍕", "🎮", "📱", "🍦", "🎬", "⚽", "🎨", "🏊", "💵"];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Rewards ({(data.rewards || []).length})</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Reward
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Icon</Label>
              <div className="flex gap-1 mt-1">
                {REWARD_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setIcon(e)}
                    className={`text-xl p-1 rounded ${icon === e ? "bg-primary/20 ring-1 ring-primary" : ""}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pizza night" />
            <div>
              <Label className="text-xs">Points cost</Label>
              <Input type="number" min={1} value={cost} onChange={(e) => setCost(+e.target.value)} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={async () => {
                if (!title.trim()) return;
                await choresApi.addReward({ title: title.trim(), icon, pointsCost: cost });
                setTitle(""); setShowAdd(false); refresh();
                toast.success("Reward added");
              }}>Add</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {(data.rewards || []).map((reward: Reward) => (
          <Card key={reward.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{reward.title}</div>
                <div className="text-xs text-muted-foreground">{reward.pointsCost} points</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                await choresApi.deleteReward(reward.id);
                refresh();
                toast.success("Reward deleted");
              }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ── Approvals Tab ──
function ApprovalsTab({ data, refresh }: any) {
  const pending = data.logs.filter(
    (l: any) => !l.undoneAt && !l.approved && data.chores.find((c: Chore) => c.id === l.choreId)?.requireApproval
  );

  return (
    <>
      <h2 className="text-base font-medium">Pending Approvals ({pending.length})</h2>
      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground">No pending approvals 🎉</p>
      )}
      <div className="space-y-2">
        {pending.map((log: any) => {
          const chore = data.chores.find((c: Chore) => c.id === log.choreId);
          const kid = data.kids.find((k: Kid) => k.id === log.kidId);
          return (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl">{chore?.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{chore?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    By {kid && <KidAvatar kid={kid} size={16} />} {kid?.name} • {new Date(log.completedAt).toLocaleString()}
                  </div>
                  {log.photoUrl && (
                    <img src={log.photoUrl} alt="Proof" className="mt-2 rounded w-32 h-32 object-cover" />
                  )}
                </div>
                <Button size="sm" onClick={async () => {
                  await choresApi.approveChore(log.id);
                  refresh();
                  toast.success("Approved!");
                }}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ── History Tab ──
function HistoryTab({ data }: any) {
  const logs = [...data.logs]
    .filter((l: any) => !l.undoneAt)
    .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 50);

  return (
    <>
      <h2 className="text-base font-medium">Recent Activity</h2>

      {/* Weekly summary */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">📊 This Week</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex flex-wrap gap-3">
            {data.kids.map((kid: Kid) => {
              const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores);
              return (
                <div key={kid.id} className="flex items-center gap-1.5 text-sm">
                  <span>{kid.avatar}</span>
                  <span style={{ color: kid.color }}>{kid.name}</span>
                  <span className="text-muted-foreground">{weekly}pts</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        {logs.map((log: any) => {
          const chore = data.chores.find((c: Chore) => c.id === log.choreId);
          const kid = data.kids.find((k: Kid) => k.id === log.kidId);
          return (
            <div key={log.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-secondary/50">
              <span>{chore?.icon}</span>
              <span className="flex-1 truncate">{chore?.title}</span>
              <span className="flex items-center gap-1" style={{ color: kid?.color }}>{kid && <KidAvatar kid={kid} size={16} />} {kid?.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(log.completedAt).toLocaleDateString()}
              </span>
              {log.approved && <Check className="w-3 h-3 text-primary" />}
            </div>
          );
        })}
      </div>
    </>
  );
}
