import { useState, useRef, useEffect } from "react";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Chore, Kid, Reward, ChoreRecurrence, TimeOfDay, RecurrenceType, BonusDay, WeeklyChallenge, StreakProtection, ChoreSubmission } from "@/lib/chores-types";
import { PhotoLightbox, PhotoThumbnail, PhotoIndicator } from "@/components/PhotoLightbox";
import { KidAvatar } from "@/components/KidAvatar";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, getKidSpentPoints, suggestFairKid,
  WEEKDAY_LABELS, TIME_OF_DAY_LABELS, daysUntilDue, getKidLevel,
  getTodayBonusMultiplier, getChallengeProgress, generateWeeklyChallenges,
  DEFAULT_SETTINGS,
} from "@/lib/chores-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Trash2, Edit, Check, X, Pause, Play, Shield, Star, Trophy, Gift, Users, ClipboardList, History, Award, Settings, Zap, BarChart3, ShieldCheck, Clock, Tag, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["🧹", "🧽", "🍽️", "🛏️", "🗑️", "🐕", "🌿", "📚", "👕", "🚗", "🧺", "🪣", "✨", "🏠", "🍳"];
const KID_EMOJIS = ["👦", "👧", "🧒", "👶", "🐱", "🐶", "🦄", "🐻", "🦊", "🐰"];
const KID_COLORS = [
  "hsl(340 80% 55%)", "hsl(210 90% 56%)", "hsl(120 60% 45%)", "hsl(36 80% 55%)",
  "hsl(280 70% 55%)", "hsl(174 72% 50%)", "hsl(0 72% 55%)", "hsl(45 90% 50%)",
];

type Tab = "chores" | "kids" | "rewards" | "history" | "approvals" | "leaderboard" | "challenges" | "settings";

export default function ParentPage() {
  const { data, refresh } = useChoresData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chores");
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const showSuggestions = data.settings?.showSuggestions ?? true;

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute('href', '/manifest-parent.json');
    document.title = 'HomeDash Parent';
    return () => {
      if (link) link.setAttribute('href', '/manifest.json');
      document.title = 'HomeDash';
    };
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Chores", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "kids", label: "Kids", icon: <Users className="w-4 h-4" /> },
    { id: "rewards", label: "Rewards", icon: <Gift className="w-4 h-4" /> },
    { id: "leaderboard", label: "Board", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "challenges", label: "Challenges", icon: <Zap className="w-4 h-4" /> },
    { id: "approvals", label: "Approvals", icon: <Shield className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <History className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const pendingApprovals = [
    ...data.logs.filter(
      (l) => !l.undoneAt && !l.approved && data.chores.find((c) => c.id === l.choreId)?.requireApproval
    ),
    ...(data.submissions || []).filter((s: ChoreSubmission) => s.status === "pending"),
  ];

  const bonus = getTodayBonusMultiplier(data.settings?.bonusDays || []);

  const pendingLogs = data.logs.filter(
    (l) => !l.undoneAt && !l.approved && data.chores.find((c) => c.id === l.choreId)?.requireApproval
  );
  const pendingSubmissions = (data.submissions || []).filter((s: ChoreSubmission) => s.status === "pending");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Parent Dashboard</h1>
          {bonus && (
            <span className="ml-auto text-sm bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-full font-medium">
              {bonus.label} ({bonus.multiplier}x)
            </span>
          )}
        </div>
      </div>

      {/* Pending banner */}
      {(pendingLogs.length > 0 || pendingSubmissions.length > 0) && tab !== "approvals" && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <button
            onClick={() => setTab("approvals")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-left transition-colors active:bg-destructive/20"
          >
            <div className="shrink-0 p-2 rounded-lg bg-destructive/20">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base text-foreground">
                {pendingLogs.length + pendingSubmissions.length} pending approval{pendingLogs.length + pendingSubmissions.length !== 1 ? "s" : ""}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {pendingLogs.length > 0 && <span>{pendingLogs.length} chore{pendingLogs.length !== 1 ? "s" : ""} awaiting review</span>}
                {pendingLogs.length > 0 && pendingSubmissions.length > 0 && <span> · </span>}
                {pendingSubmissions.length > 0 && <span>{pendingSubmissions.length} kid submission{pendingSubmissions.length !== 1 ? "s" : ""}</span>}
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180 shrink-0" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex flex-col items-center gap-0.5 px-3.5 py-3 min-w-[64px] whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative">
                {t.icon}
                {t.id === "approvals" && pendingApprovals.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 min-w-[16px] text-center leading-4">
                    {pendingApprovals.length}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium">{t.label}</span>
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
            showSuggestions={showSuggestions}
            setShowSuggestions={async (v: boolean) => {
              await choresApi.updateSettings({ ...data.settings, showSuggestions: v });
              refresh();
            }}
          />
        )}
        {tab === "kids" && (
          <KidsTab data={data} refresh={refresh} showAdd={showAddKid} setShowAdd={setShowAddKid} />
        )}
        {tab === "rewards" && (
          <RewardsTab data={data} refresh={refresh} showAdd={showAddReward} setShowAdd={setShowAddReward} />
        )}
        {tab === "leaderboard" && <LeaderboardTab data={data} />}
        {tab === "challenges" && <ChallengesTab data={data} refresh={refresh} />}
        {tab === "approvals" && <ApprovalsTab data={data} refresh={refresh} />}
        {tab === "history" && <HistoryTab data={data} refresh={refresh} />}
        {tab === "settings" && <SettingsTab data={data} refresh={refresh} />}
      </div>
    </div>
  );
}

// ── Chores Tab ──
function ChoresTab({ data, refresh, showAdd, setShowAdd, editingChore, setEditingChore, showSuggestions, setShowSuggestions }: any) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const categories = data.settings?.categories || DEFAULT_SETTINGS.categories;

  const filteredChores = filterCategory === "all"
    ? data.chores
    : data.chores.filter((c: Chore) => c.category === filterCategory);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Chores ({data.chores.length})</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showSuggestions}
              onChange={(e: any) => setShowSuggestions(e.target.checked)}
              className="rounded"
            />
            Suggestions
          </label>
          <Button size="sm" onClick={() => { setEditingChore(null); setShowAdd(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Chore
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-2 py-0.5 rounded-full text-xs ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >All</button>
        {categories.map((cat: string) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-xs ${filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >{cat}</button>
        ))}
      </div>

      {(showAdd || editingChore) && (
        <ChoreForm
          chore={editingChore}
          categories={categories}
          kids={data.kids}
          rotationEnabled={data.settings?.rotationEnabled ?? false}
          onSave={async (chore: any) => {
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
        {filteredChores.map((chore: Chore) => {
          const due = isChoreDueToday(chore, data.logs);
          const completed = isChoreCompletedToday(chore.id, data.logs);
          const kid = completed ? data.kids.find((k: Kid) => k.id === completed.kidId) : null;
          const fairKid = suggestFairKid(chore.id, data.kids, data.logs, chore.rotationKids, data.settings?.rotationEnabled);
          const countdown = daysUntilDue(chore, data.logs);

          // Per-kid completion tracking
          const perKidCompletions = chore.perKid
            ? data.kids.map((k: Kid) => ({ kid: k, log: isChoreCompletedToday(chore.id, data.logs, k.id) }))
            : [];
          const allKidsDone = chore.perKid && perKidCompletions.every((x: any) => x.log);

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
                      {chore.perKid && <span title="Each kid completes"><Users className="w-3 h-3 text-muted-foreground" /></span>}
                      {chore.paused && <Pause className="w-3 h-3 text-muted-foreground" />}
                      {chore.deadline && <span title={`Deadline: ${chore.deadline}`}><Clock className="w-3 h-3 text-muted-foreground" /></span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{chore.points}pts</span>
                      <span>{"⭐".repeat(chore.difficulty)}</span>
                      <span>{TIME_OF_DAY_LABELS[chore.timeOfDay]}</span>
                      {chore.category && (
                        <span className="bg-secondary px-1.5 rounded text-[10px]">{chore.category}</span>
                      )}
                      {chore.deadline && (
                        <span className="text-primary">⏰ {chore.deadline}{chore.earlyBonus ? ` (+${chore.earlyBonus})` : ""}</span>
                      )}
                      {countdown !== null && countdown > 0 && (
                        <span className="text-primary">Due in {countdown}d</span>
                      )}
                      {due && !completed && !chore.perKid && (
                        <span className="text-yellow-500 font-medium">Due today</span>
                      )}
                      {!chore.perKid && completed && kid && (
                        <span style={{ color: kid.color }}>✅ {kid.name}</span>
                      )}
                    </div>
                    {chore.perKid && due && (
                      <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                        {perKidCompletions.map((x: any) => (
                          <span key={x.kid.id} className={`flex items-center gap-0.5 ${x.log ? "" : "opacity-50"}`} style={{ color: x.kid.color }}>
                            <KidAvatar kid={x.kid} size={14} />
                            {x.log ? "✅" : "⬜"}
                          </span>
                        ))}
                        {allKidsDone && <span className="text-primary font-medium">All done!</span>}
                      </div>
                    )}
                    {showSuggestions && fairKid && !completed && due && (
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: fairKid.color }}>
                        {data.settings?.rotationEnabled && chore.rotationKids?.length ? "Rotation:" : "Suggestion:"}{" "}
                        <KidAvatar kid={fairKid} size={16} /> {fairKid.name}'s turn
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
function ChoreForm({ chore, categories, kids, rotationEnabled, onSave, onCancel }: {
  chore?: Chore | null; categories: string[]; kids: Kid[]; rotationEnabled: boolean;
  onSave: (c: any) => void; onCancel: () => void;
}) {
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
  const [perKid, setPerKid] = useState(chore?.perKid ?? false);
  const [category, setCategory] = useState(chore?.category ?? "");
  const [deadline, setDeadline] = useState(chore?.deadline ?? "");
  const [earlyBonus, setEarlyBonus] = useState(chore?.earlyBonus ?? 0);
  const [rotationKids, setRotationKids] = useState<string[]>(chore?.rotationKids ?? []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const recurrence: ChoreRecurrence = { type: recType };
    if (recType === "interval") recurrence.intervalDays = intervalDays;
    if (recType === "weekly") recurrence.weekdays = weekdays;
    onSave({
      title: title.trim(), icon, points, difficulty, timeOfDay,
      recurrence, requirePhoto, requireApproval, paused: chore?.paused ?? false,
      perKid: perKid || undefined,
      category: category || undefined,
      deadline: deadline || undefined,
      earlyBonus: earlyBonus > 0 ? earlyBonus : undefined,
      rotationKids: rotationKids.length > 0 ? rotationKids : undefined,
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

        {/* Category */}
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category || "_none"} onValueChange={(v) => setCategory(v === "_none" ? "" : v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No category</SelectItem>
              {categories.map((c: string) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Deadline & Early Bonus */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Deadline (optional)</Label>
            <Input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Early bonus pts</Label>
            <Input type="number" min={0} value={earlyBonus} onChange={(e) => setEarlyBonus(+e.target.value)} className="mt-1" />
          </div>
        </div>

        {/* Rotation */}
        {rotationEnabled && kids.length > 0 && (
          <div>
            <Label className="text-xs">Rotation kids (auto-assign)</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {kids.map((k: Kid) => (
                <button
                  key={k.id}
                  onClick={() => setRotationKids((prev) =>
                    prev.includes(k.id) ? prev.filter((id) => id !== k.id) : [...prev, k.id]
                  )}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    rotationKids.includes(k.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <KidAvatar kid={k} size={14} /> {k.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch checked={requirePhoto} onCheckedChange={setRequirePhoto} />
            <Label className="text-xs">Require photo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            <Label className="text-xs">Require approval</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={perKid} onCheckedChange={setPerKid} />
            <Label className="text-xs">Each kid completes</Label>
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
          const streak = getKidStreak(kid.id, data.logs, data.streakProtections);
          const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
          const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);
          const level = getKidLevel(total);

          return (
            <Card key={kid.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: kid.color + "33" }}>
                    <KidAvatar kid={kid} size={48} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: kid.color }}>{kid.name}</span>
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded" title={`Level ${level.level}`}>
                        {level.icon} {level.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>🏆 {total}pts</span>
                      <span>📅 {weekly}/week</span>
                      <span>🔥 {streak}d streak</span>
                      <span>💰 {available} avail</span>
                    </div>
                    {level.nextLevel && (
                      <div className="mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                          <span>Next: {level.nextLevel.icon} {level.nextLevel.name} ({level.nextLevel.minPoints}pts)</span>
                        </div>
                        <Progress value={level.progress} className="h-1" />
                      </div>
                    )}
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

// ── Leaderboard Tab ──
function LeaderboardTab({ data }: any) {
  const kidStats = data.kids.map((kid: Kid) => {
    const total = getKidTotalPoints(kid.id, data.logs, data.chores);
    const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores);
    const streak = getKidStreak(kid.id, data.logs, data.streakProtections);
    const level = getKidLevel(total);
    const choresDone = data.logs.filter((l: any) => l.kidId === kid.id && !l.undoneAt).length;
    return { kid, total, weekly, streak, level, choresDone };
  }).sort((a: any, b: any) => b.total - a.total);

  const trophies = ["🥇", "🥈", "🥉"];

  return (
    <>
      <h2 className="text-base font-medium">🏆 Leaderboard</h2>

      {/* Weekly rankings */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">📅 This Week</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {[...kidStats].sort((a: any, b: any) => b.weekly - a.weekly).map((stat: any, i: number) => (
            <div key={stat.kid.id} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{trophies[i] || `${i + 1}.`}</span>
              <KidAvatar kid={stat.kid} size={32} />
              <div className="flex-1">
                <span className="font-medium text-sm" style={{ color: stat.kid.color }}>{stat.kid.name}</span>
              </div>
              <span className="font-bold text-sm">{stat.weekly} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All-time stats */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🏅 All-Time</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {kidStats.map((stat: any, i: number) => (
            <div key={stat.kid.id} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{trophies[i] || `${i + 1}.`}</span>
              <KidAvatar kid={stat.kid} size={36} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm" style={{ color: stat.kid.color }}>{stat.kid.name}</span>
                  <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                    {stat.level.icon} {stat.level.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>🏆 {stat.total} pts</span>
                  <span>✅ {stat.choresDone} chores</span>
                  <span>🔥 {stat.streak}d streak</span>
                </div>
                {stat.level.nextLevel && (
                  <Progress value={stat.level.progress} className="h-1 mt-1" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ── Challenges Tab ──
function ChallengesTab({ data, refresh }: any) {
  const challenges: WeeklyChallenge[] = data.challenges || [];
  const now = new Date();

  // Get current week's Monday
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const monday = new Date(today.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1)) * 86400000);
  const mondayStr = monday.toISOString().split("T")[0];

  const currentChallenges = challenges.filter((c) => {
    const ws = new Date(c.weekStart);
    const we = new Date(ws.getTime() + 7 * 86400000);
    return now >= ws && now < we;
  });

  const generateNew = async () => {
    const templates = generateWeeklyChallenges();
    for (const t of templates) {
      await choresApi.addChallenge({ ...t, weekStart: mondayStr });
    }
    refresh();
    toast.success("New challenges generated!");
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">⚡ Weekly Challenges</h2>
        <Button size="sm" onClick={generateNew}>
          <Zap className="w-4 h-4 mr-1" /> Generate New
        </Button>
      </div>

      {currentChallenges.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active challenges this week.</p>
            <p className="text-xs mt-1">Click "Generate New" to create weekly challenges!</p>
          </CardContent>
        </Card>
      )}

      {currentChallenges.map((challenge) => (
        <Card key={challenge.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{challenge.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{challenge.title}</div>
                <div className="text-xs text-muted-foreground">{challenge.description}</div>
                <div className="text-xs text-primary mt-1">+{challenge.bonusPoints} bonus points</div>

                {/* Progress per kid */}
                <div className="mt-3 space-y-2">
                  {data.kids.map((kid: Kid) => {
                    const progress = getChallengeProgress(challenge, kid.id, data.logs, data.chores);
                    const completed = challenge.completedBy?.includes(kid.id);
                    const pct = Math.min(100, (progress / challenge.targetValue) * 100);
                    return (
                      <div key={kid.id}>
                        <div className="flex items-center gap-2 text-xs mb-0.5">
                          <KidAvatar kid={kid} size={14} />
                          <span style={{ color: kid.color }}>{kid.name}</span>
                          <span className="text-muted-foreground ml-auto">
                            {progress}/{challenge.targetValue}
                            {completed && " ✅"}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                await choresApi.deleteChallenge(challenge.id);
                refresh();
                toast.success("Challenge removed");
              }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ── Approvals Tab ──
function ApprovalsTab({ data, refresh }: any) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const pendingLogs = data.logs.filter(
    (l: any) => !l.undoneAt && !l.approved && data.chores.find((c: Chore) => c.id === l.choreId)?.requireApproval
  );
  const pendingSubmissions: ChoreSubmission[] = (data.submissions || []).filter(
    (s: ChoreSubmission) => s.status === "pending"
  );

  const totalPending = pendingLogs.length + pendingSubmissions.length;

  return (
    <>
      <h2 className="text-base font-medium">Pending Approvals ({totalPending})</h2>
      {totalPending === 0 && (
        <p className="text-sm text-muted-foreground">No pending approvals 🎉</p>
      )}

      {/* Chore submissions from kids */}
      {pendingSubmissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">📤 Kid Submissions</h3>
          {pendingSubmissions.map((sub: ChoreSubmission) => {
            const kid = data.kids.find((k: Kid) => k.id === sub.kidId);
            return (
              <Card key={sub.id} className="border-yellow-500/30">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Send className="w-5 h-5 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{sub.title}</div>
                      <div className="text-xs text-muted-foreground">
                        By {kid && <KidAvatar kid={kid} size={16} />} {kid?.name} • {new Date(sub.submittedAt).toLocaleString()}
                      </div>
                      {sub.note && <div className="text-xs text-muted-foreground mt-1">📝 {sub.note}</div>}
                      <div className="text-xs mt-1">Requested: <span className="font-medium">{sub.points}pts</span></div>
                      {sub.photoUrl && (
                        <PhotoThumbnail src={sub.photoUrl} onClick={() => setLightboxPhoto(sub.photoUrl!)} />
                      )}
                      {rejectingId === sub.id && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)..."
                            className="text-xs h-8"
                          />
                          <Button size="sm" variant="destructive" onClick={async () => {
                            await choresApi.rejectSubmission(sub.id, rejectReason);
                            refresh();
                            setRejectingId(null);
                            setRejectReason("");
                            toast.success("Rejected");
                          }}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    {rejectingId !== sub.id && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={async () => {
                          await choresApi.approveSubmission(sub.id);
                          refresh();
                          toast.success(`Approved! +${sub.points}pts`);
                        }}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(sub.id)}>
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Regular chore approvals */}
      {pendingLogs.length > 0 && (
        <div className="space-y-2">
          {pendingSubmissions.length > 0 && <h3 className="text-sm font-medium text-muted-foreground">📋 Chore Completions</h3>}
          {pendingLogs.map((log: any) => {
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
                      <PhotoThumbnail src={log.photoUrl} onClick={() => setLightboxPhoto(log.photoUrl)} />
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
      )}
      <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </>
  );
}

// ── History Tab ──
function HistoryTab({ data, refresh }: any) {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
                  <KidAvatar kid={kid} size={16} />
                  <span style={{ color: kid.color }}>{kid.name}</span>
                  <span className="text-muted-foreground">{weekly}pts</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        {logs.map((log: any) => {
          const chore = data.chores.find((c: Chore) => c.id === log.choreId);
          const kid = data.kids.find((k: Kid) => k.id === log.kidId);
          const isExpanded = expandedId === log.id;
          const completedDate = new Date(log.completedAt);

          return (
            <Card key={log.id} className={`transition-colors ${isExpanded ? "border-primary/30" : ""}`}>
              <button
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <span className="text-lg">{chore?.icon}</span>
                <span className="flex-1 truncate font-medium">{chore?.title}</span>
                <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: kid?.color }}>
                  {kid && <KidAvatar kid={kid} size={16} />}
                  {kid?.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {completedDate.toLocaleDateString()}
                </span>
                {log.photoUrl && <span className="text-xs shrink-0">📷</span>}
                <svg
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Completed</span>
                      <div className="font-medium">
                        {completedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        {" at "}
                        {completedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Points earned</span>
                      <div className="font-medium">
                        +{chore?.points || 0}pts
                        {log.bonusMultiplier && log.bonusMultiplier > 1 && (
                          <span className="ml-1 text-yellow-400">({log.bonusMultiplier}x bonus)</span>
                        )}
                        {log.earlyBonusEarned && (
                          <span className="ml-1 text-primary">+{log.earlyBonusEarned} early</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Difficulty</span>
                      <div className="font-medium">{"⭐".repeat(chore?.difficulty || 1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Category</span>
                      <div className="font-medium">{chore?.category || "—"}</div>
                    </div>
                    {chore?.requireApproval && (
                      <div>
                        <span className="text-muted-foreground text-xs">Approval</span>
                        <div className="font-medium">{log.approved ? "✅ Approved" : "⏳ Pending"}</div>
                      </div>
                    )}
                    {chore?.requirePhoto && !log.photoUrl && (
                      <div>
                        <span className="text-muted-foreground text-xs">Photo proof</span>
                        <div className="font-medium">❌ Missing</div>
                      </div>
                    )}
                  </div>

                  {log.photoUrl && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1.5">📷 Photo proof</span>
                      <img
                        src={log.photoUrl}
                        alt="Chore proof"
                        className="w-36 h-36 rounded-lg object-cover cursor-pointer border border-border hover:border-primary/50 transition-colors"
                        onClick={() => setLightboxPhoto(log.photoUrl)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        await choresApi.deleteLog(log.id);
                        refresh();
                        toast.success("Log entry removed");
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </>
  );
}

// ── Settings Tab ──
function SettingsTab({ data, refresh }: any) {
  const settings = data.settings || DEFAULT_SETTINGS;
  const [rotationEnabled, setRotationEnabled] = useState(settings.rotationEnabled ?? false);
  const [showSuggestions, setShowSuggestions] = useState(settings.showSuggestions ?? true);
  const [categories, setCategories] = useState<string[]>(settings.categories || DEFAULT_SETTINGS.categories);
  const [newCategory, setNewCategory] = useState("");
  const [bonusDays, setBonusDays] = useState<BonusDay[]>(settings.bonusDays || []);
  const [newBonusDayOfWeek, setNewBonusDayOfWeek] = useState(6); // Saturday
  const [newBonusMultiplier, setNewBonusMultiplier] = useState(2);
  const [newBonusLabel, setNewBonusLabel] = useState("");

  // Streak protection
  const [spKidId, setSpKidId] = useState(data.kids[0]?.id || "");
  const [spDate, setSpDate] = useState(new Date().toISOString().split("T")[0]);
  const [spReason, setSpReason] = useState("Sick");

  const saveSettings = async (partial: any) => {
    const updated = { ...settings, ...partial };
    await choresApi.updateSettings(updated);
    refresh();
    toast.success("Settings saved");
  };

  return (
    <>
      <h2 className="text-base font-medium">⚙️ Chore Settings</h2>

      {/* Rotation */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">🔄 Chore Rotation</Label>
              <p className="text-xs text-muted-foreground">Auto-assign chores to kids in rotating order</p>
            </div>
            <Switch checked={rotationEnabled} onCheckedChange={(v) => {
              setRotationEnabled(v);
              saveSettings({ rotationEnabled: v, showSuggestions, categories, bonusDays });
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">💡 Kid Suggestions</Label>
              <p className="text-xs text-muted-foreground">Show suggested kid assignments on chores, widget & kids page</p>
            </div>
            <Switch checked={showSuggestions} onCheckedChange={(v) => {
              setShowSuggestions(v);
              saveSettings({ rotationEnabled, showSuggestions: v, categories, bonusDays });
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">🏷️ Categories</Label>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                <span>{cat}</span>
                <button onClick={() => {
                  const updated = categories.filter((c) => c !== cat);
                  setCategories(updated);
                  saveSettings({ rotationEnabled, showSuggestions, categories: updated, bonusDays });
                }} className="text-destructive hover:text-destructive/80">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="flex-1" />
            <Button size="sm" onClick={() => {
              if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
              const updated = [...categories, newCategory.trim()];
              setCategories(updated);
              setNewCategory("");
              saveSettings({ rotationEnabled, showSuggestions, categories: updated, bonusDays });
            }}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Days */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">🎉 Bonus Days</Label>
          <p className="text-xs text-muted-foreground">Set specific days with point multipliers</p>

          {bonusDays.map((bd) => (
            <div key={bd.id} className="flex items-center gap-2 text-sm bg-secondary/50 px-3 py-2 rounded">
              <span className="flex-1">
                {bd.dayOfWeek >= 0 ? WEEKDAY_LABELS[bd.dayOfWeek] : bd.date} — {bd.multiplier}x — {bd.label}
              </span>
              <button onClick={() => {
                const updated = bonusDays.filter((b) => b.id !== bd.id);
                setBonusDays(updated);
                saveSettings({ rotationEnabled, showSuggestions, categories, bonusDays: updated });
              }} className="text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Day</Label>
              <Select value={String(newBonusDayOfWeek)} onValueChange={(v) => setNewBonusDayOfWeek(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Multiplier</Label>
              <Input type="number" min={1.5} step={0.5} value={newBonusMultiplier} onChange={(e) => setNewBonusMultiplier(+e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={newBonusLabel} onChange={(e) => setNewBonusLabel(e.target.value)} placeholder="2x Sunday" className="mt-1" />
            </div>
          </div>
          <Button size="sm" onClick={() => {
            const bd: BonusDay = {
              id: `bd_${Date.now()}`,
              dayOfWeek: newBonusDayOfWeek,
              multiplier: newBonusMultiplier,
              label: newBonusLabel || `${newBonusMultiplier}x ${WEEKDAY_LABELS[newBonusDayOfWeek]}`,
            };
            const updated = [...bonusDays, bd];
            setBonusDays(updated);
            setNewBonusLabel("");
            saveSettings({ rotationEnabled, showSuggestions, categories, bonusDays: updated });
          }}>
            <Plus className="w-4 h-4 mr-1" /> Add Bonus Day
          </Button>
        </CardContent>
      </Card>

      {/* Streak Protection */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">🛡️ Streak Protection</Label>
          <p className="text-xs text-muted-foreground">Mark days off (sick, vacation) to keep streaks alive</p>

          {/* Existing protections */}
          {(data.streakProtections || []).map((sp: StreakProtection) => {
            const kid = data.kids.find((k: Kid) => k.id === sp.kidId);
            return (
              <div key={sp.id} className="flex items-center gap-2 text-sm bg-secondary/50 px-3 py-2 rounded">
                {kid && <KidAvatar kid={kid} size={16} />}
                <span className="flex-1">
                  {kid?.name} — {sp.date} — {sp.reason}
                </span>
                <button onClick={async () => {
                  await choresApi.deleteStreakProtection(sp.id);
                  refresh();
                }} className="text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Kid</Label>
              <Select value={spKidId} onValueChange={setSpKidId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.kids.map((k: Kid) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={spDate} onChange={(e) => setSpDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={spReason} onValueChange={setSpReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sick">🤒 Sick</SelectItem>
                  <SelectItem value="Vacation">🏖️ Vacation</SelectItem>
                  <SelectItem value="Holiday">🎄 Holiday</SelectItem>
                  <SelectItem value="Other">📝 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={async () => {
            if (!spKidId) return;
            await choresApi.addStreakProtection({ kidId: spKidId, date: spDate, reason: spReason });
            refresh();
            toast.success("Streak protected!");
          }}>
            <ShieldCheck className="w-4 h-4 mr-1" /> Protect Day
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
