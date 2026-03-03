import { useState, useRef, useEffect } from "react";
import { useChoresData } from "@/hooks/useChoresData";
import { choresApi } from "@/lib/chores-api";
import type { Chore, Kid, Reward, ChoreRecurrence, TimeOfDay, RecurrenceType, ChoreSubmission, GradeSubmission, GradeScaleEntry } from "@/lib/chores-types";
import { GradesTab } from "@/components/GradesTab";
import { PhotoLightbox, PhotoThumbnail, PhotoIndicator } from "@/components/PhotoLightbox";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { KidAvatar } from "@/components/KidAvatar";
import {
  isChoreDueToday, isChoreCompletedToday, getKidTotalPoints, getKidWeeklyPoints,
  getKidStreak, getKidAvailablePoints, getKidSpentPoints, suggestFairKid,
  WEEKDAY_LABELS, TIME_OF_DAY_LABELS, daysUntilDue, getKidLevel,
  getStreakBonusMultiplier,
  DEFAULT_SETTINGS, DEFAULT_GRADE_SCALE, DEFAULT_SUBJECTS,
} from "@/lib/chores-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Trash2, Edit, Check, X, Pause, Play, Shield, Star, Trophy, Gift, Users, ClipboardList, History, Award, Settings, BarChart3, Clock, Tag, Send, Menu, ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["🧹", "🧽", "🍽️", "🛏️", "🗑️", "🐕", "🌿", "📚", "👕", "🚗", "🧺", "🪣", "✨", "🏠", "🍳"];
const KID_EMOJIS = ["👦", "👧", "🧒", "👶", "🐱", "🐶", "🦄", "🐻", "🦊", "🐰"];
const KID_COLORS = [
  "hsl(340 80% 55%)", "hsl(210 90% 56%)", "hsl(120 60% 45%)", "hsl(36 80% 55%)",
  "hsl(280 70% 55%)", "hsl(174 72% 50%)", "hsl(0 72% 55%)", "hsl(45 90% 50%)",
];

type Tab = "chores" | "kids" | "rewards" | "approvals" | "leaderboard" | "settings" | "grades";

export default function ParentPage() {
  const { data, refresh } = useChoresData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chores");
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const showSuggestions = data.settings?.showSuggestions ?? true;
  const gradesEnabled = data.settings?.gradesEnabled ?? false;

  useEffect(() => {
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.setAttribute('href', '/manifest-parent.json');
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = '/icon-parent.png';
    if (appleTouchIcon) appleTouchIcon.href = '/icon-parent.png';
    document.title = 'HomeDash Parent';
    return () => {
      if (manifest) manifest.setAttribute('href', '/manifest-dashboard.json');
      if (favicon) favicon.href = '/favicon.png';
      if (appleTouchIcon) appleTouchIcon.href = '/favicon.png';
      document.title = 'HomeDash';
    };
  }, []);

  // Bottom bar: primary navigation
  const bottomTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Chores", icon: <ClipboardList className="w-5 h-5" /> },
    { id: "approvals", label: "Approve", icon: <Shield className="w-5 h-5" /> },
    { id: "leaderboard", label: "Board", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "rewards", label: "Rewards", icon: <Gift className="w-5 h-5" /> },
    ...(gradesEnabled ? [{ id: "grades" as Tab, label: "Grades", icon: <GraduationCap className="w-5 h-5" /> }] : []),
  ];

  const allTabs = [...bottomTabs, { id: "settings" as Tab, label: "Settings" }, { id: "kids" as Tab, label: "Kids" }];

  const pendingApprovals = [
    ...data.logs.filter(
      (l) => !l.undoneAt && !l.approved && data.chores.find((c) => c.id === l.choreId)?.requireApproval
    ),
    ...(data.submissions || []).filter((s: ChoreSubmission) => s.status === "pending"),
    ...(data.gradeSubmissions || []).filter((s: GradeSubmission) => s.status === "pending"),
  ];

  const currentTabLabel = allTabs.find((t) => t.id === tab)?.label || "Chores";

  // Determine if current tab supports FAB
  const fabAction = tab === "chores" ? () => { setEditingChore(null); setShowAddChore(true); }
    : tab === "rewards" ? () => setShowAddReward(true)
    : tab === "grades" ? () => setShowAddGrade(true)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-xl font-bold flex-1">{currentTabLabel}</h1>
          {pendingApprovals.length > 0 && tab !== "approvals" && (
            <button
              onClick={() => setTab("approvals")}
              className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-2 rounded-full text-sm font-medium active:bg-destructive/20 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>{pendingApprovals.length}</span>
            </button>
          )}
          <button
            onClick={() => setTab("settings")}
            className={`p-2 rounded-full transition-colors ${tab === "settings" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground active:bg-muted"}`}
          >
            <Settings className="w-5 h-5" />
          </button>
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
          />
        )}
        {tab === "rewards" && (
          <RewardsTab data={data} refresh={refresh} showAdd={showAddReward} setShowAdd={setShowAddReward} />
        )}
        {tab === "leaderboard" && <LeaderboardTab data={data} refresh={refresh} />}
        {tab === "approvals" && <ApprovalsTab data={data} refresh={refresh} />}
        {tab === "grades" && gradesEnabled && (
          <GradesTab data={data} refresh={refresh} showAdd={showAddGrade} setShowAdd={setShowAddGrade} />
        )}
        {tab === "settings" && <SettingsTab data={data} refresh={refresh} showAddKid={showAddKid} setShowAddKid={setShowAddKid} />}
      </div>

      {/* FAB - Floating Action Button */}
      {fabAction && (
        <button
          onClick={fabAction}
          className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Tab Navigation - 4 items only */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t border-border pb-6 pt-1">
        <div className="max-w-2xl mx-auto flex">
          {bottomTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 text-[10px] font-medium transition-colors relative ${
                tab === t.id
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              <span className="relative">
                {t.icon}
                {t.id === "approvals" && pendingApprovals.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingApprovals.length}
                  </span>
                )}
              </span>
              <span>{t.label}</span>
              {tab === t.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Section Hook ──
function useCollapsible(defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);
  return { open, toggle: () => setOpen(!open), setOpen };
}

// ── Chores Tab ──
function ChoresTab({ data, refresh, showAdd, setShowAdd, editingChore, setEditingChore, showSuggestions }: any) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const categoriesEnabled = data.settings?.categoriesEnabled ?? false;
  const categories = data.settings?.categories || DEFAULT_SETTINGS.categories;
  const [expandedChoreId, setExpandedChoreId] = useState<string | null>(null);

  const realChores = data.chores.filter((c: Chore) => !c.id.startsWith("grade_"));
  const filteredChores = (!categoriesEnabled || filterCategory === "all")
    ? realChores
    : realChores.filter((c: Chore) => c.category === filterCategory);

  return (
    <>
      <h2 className="text-xl font-semibold">Chores ({realChores.length})</h2>

      {/* Category filter */}
      {categoriesEnabled && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >All</button>
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >{cat}</button>
          ))}
        </div>
      )}

      {(showAdd || editingChore) && (
        <ChoreForm
          chore={editingChore}
          categories={categories}
          categoriesEnabled={categoriesEnabled}
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
          const isExpanded = expandedChoreId === chore.id;

          const perKidCompletions = chore.perKid
            ? data.kids.map((k: Kid) => ({ kid: k, log: isChoreCompletedToday(chore.id, data.logs, k.id) }))
            : [];
          const allKidsDone = chore.perKid && perKidCompletions.every((x: any) => x.log);

          return (
            <Card key={chore.id} className={`${chore.paused ? "opacity-50" : ""}`}>
              <CardContent className="p-0">
                {/* Summary row - always visible, tappable */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left min-h-[56px]"
                  onClick={() => setExpandedChoreId(isExpanded ? null : chore.id)}
                >
                  <span className="text-2xl">{chore.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base truncate">{chore.title}</span>
                      {chore.requirePhoto && <span className="text-sm">📸</span>}
                      {chore.paused && <Pause className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-2 text-[15px] text-muted-foreground mt-0.5 flex-wrap">
                      <span>{chore.points}pts</span>
                      <span>{"⭐".repeat(chore.difficulty)}</span>
                      {due && !completed && !chore.perKid && (
                        <span className="text-yellow-500 font-medium">Due today</span>
                      )}
                      {!chore.perKid && completed && kid && (
                        <span style={{ color: kid.color }}>✅ {kid.name}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 text-[15px] text-muted-foreground flex-wrap pt-3">
                      {chore.requireApproval && <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Approval</span>}
                      {chore.perKid && <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Per kid</span>}
                      <span>{TIME_OF_DAY_LABELS[chore.timeOfDay]}</span>
                      {categoriesEnabled && chore.category && (
                        <span className="bg-secondary px-2 py-0.5 rounded text-xs">{chore.category}</span>
                      )}
                      {chore.deadline && (
                        <span className="text-primary flex items-center gap-1"><Clock className="w-4 h-4" /> {chore.deadline}{chore.earlyBonus ? ` (+${chore.earlyBonus})` : ""}</span>
                      )}
                      {countdown !== null && countdown > 0 && (
                        <span className="text-primary">Due in {countdown}d</span>
                      )}
                    </div>

                    {chore.perKid && due && (
                      <div className="flex items-center gap-2 text-[15px] flex-wrap">
                        {perKidCompletions.map((x: any) => (
                          <span key={x.kid.id} className={`flex items-center gap-0.5 ${x.log ? "" : "opacity-50"}`} style={{ color: x.kid.color }}>
                            <KidAvatar kid={x.kid} size={20} />
                            {x.log ? "✅" : "⬜"}
                          </span>
                        ))}
                        {allKidsDone && <span className="text-primary font-medium">All done!</span>}
                      </div>
                    )}

                    {showSuggestions && fairKid && !completed && due && (
                      <div className="flex items-center gap-1 text-[15px]" style={{ color: fairKid.color }}>
                        {data.settings?.rotationEnabled && chore.rotationKids?.length ? "Rotation:" : "Suggestion:"}{" "}
                        <KidAvatar kid={fairKid} size={20} /> {fairKid.name}'s turn
                      </div>
                    )}

                    {/* Action buttons - large touch targets */}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 h-12 text-sm" onClick={async () => {
                        await choresApi.updateChore(chore.id, { paused: !chore.paused });
                        refresh();
                        toast.success(chore.paused ? "Chore resumed" : "Chore paused");
                      }}>
                        {chore.paused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                        {chore.paused ? "Resume" : "Pause"}
                      </Button>
                      <Button variant="outline" className="flex-1 h-12 text-sm" onClick={() => setEditingChore(chore)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button variant="outline" className="h-12 text-sm text-destructive" onClick={async () => {
                        await choresApi.deleteChore(chore.id);
                        refresh();
                        toast.success("Chore deleted");
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ── Chore Form ──
function ChoreForm({ chore, categories, categoriesEnabled, kids, rotationEnabled, onSave, onCancel }: {
  chore?: Chore | null; categories: string[]; categoriesEnabled: boolean; kids: Kid[]; rotationEnabled: boolean;
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
            <Label className="text-sm font-medium">Icon</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setIcon(e)}
                  className={`text-xl p-1.5 rounded min-w-[40px] min-h-[40px] flex items-center justify-center ${icon === e ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vacuum upstairs" className="mt-1 h-12 text-base" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium">Points</Label>
            <Input type="number" min={1} value={points} onChange={(e) => setPoints(+e.target.value)} className="mt-1 h-12 text-base" />
          </div>
          <div>
            <Label className="text-sm font-medium">Difficulty</Label>
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className="text-lg min-w-[28px] min-h-[36px] flex items-center justify-center">
                  {d <= difficulty ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {categoriesEnabled && (
          <div>
            <Label className="text-sm font-medium">Category</Label>
            <Select value={category || "_none"} onValueChange={(v) => setCategory(v === "_none" ? "" : v)}>
              <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No category</SelectItem>
                {categories.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">Time of Day</Label>
          <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
            <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_OF_DAY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Recurrence</Label>
          <Select value={recType} onValueChange={(v) => setRecType(v as RecurrenceType)}>
            <SelectTrigger className="mt-1 h-12 text-base"><SelectValue /></SelectTrigger>
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
            <Label className="text-sm">Every how many days?</Label>
            <Input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(+e.target.value)} className="mt-1 h-12 text-base" />
          </div>
        )}

        {recType === "weekly" && (
          <div>
            <Label className="text-sm">Which days?</Label>
            <div className="flex gap-1.5 mt-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setWeekdays((w) => w.includes(i) ? w.filter((d) => d !== i) : [...w, i])}
                  className={`px-3 py-2 rounded text-sm font-medium min-h-[40px] ${
                    weekdays.includes(i) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">Deadline (optional)</Label>
            <Input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 h-10 text-sm w-full min-w-0 max-w-full" />
          </div>
          <div>
            <Label className="text-sm">Early bonus pts</Label>
            <Input type="number" min={0} value={earlyBonus} onChange={(e) => setEarlyBonus(+e.target.value)} className="mt-1 h-12 text-base" />
          </div>
        </div>

        {rotationEnabled && kids.length > 0 && (
          <div>
            <Label className="text-sm">Rotation kids (auto-assign)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {kids.map((k: Kid) => (
                <button
                  key={k.id}
                  onClick={() => setRotationKids((prev) =>
                    prev.includes(k.id) ? prev.filter((id) => id !== k.id) : [...prev, k.id]
                  )}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm min-h-[40px] ${
                    rotationKids.includes(k.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <KidAvatar kid={k} size={18} /> {k.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-[15px]">Require photo</Label>
            <Switch checked={requirePhoto} onCheckedChange={setRequirePhoto} />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-[15px]">Require approval</Label>
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-[15px]">Each kid completes</Label>
            <Switch checked={perKid} onCheckedChange={setPerKid} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1 h-12 text-base">
            <Check className="w-5 h-5 mr-2" /> {chore ? "Update" : "Add"} Chore
          </Button>
          <Button variant="outline" onClick={onCancel} className="h-12 px-4">
            <X className="w-5 h-5" />
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
          const total = getKidTotalPoints(kid.id, data.logs, data.chores);
          const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores);
          const streak = getKidStreak(kid.id, data.logs);
          const available = getKidAvailablePoints(kid.id, data.logs, data.chores, data.rewardClaims, data.rewards);
          const badges = (data.kidBadges || []).filter((kb: any) => kb.kidId === kid.id);
          const level = getKidLevel(total);
          const isExpanded = expandedKidId === kid.id;

          return (
            <Card key={kid.id}>
              <CardContent className="p-0">
                {/* Summary row */}
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

                {/* Expanded details */}
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

// ── Rewards Tab ──
function RewardsTab({ data, refresh, showAdd, setShowAdd }: any) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState(50);
  const REWARD_EMOJIS = ["🎁", "🍕", "🎮", "📱", "🍦", "🎬", "⚽", "🎨", "🏊", "💵"];

  return (
    <>
      <h2 className="text-xl font-semibold">Rewards ({(data.rewards || []).length})</h2>

      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">Icon</Label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {REWARD_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setIcon(e)}
                    className={`text-xl p-1.5 rounded min-w-[40px] min-h-[40px] flex items-center justify-center ${icon === e ? "bg-primary/20 ring-2 ring-primary" : ""}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pizza night" className="h-12 text-base" />
            <div>
              <Label className="text-sm font-medium">Points cost</Label>
              <Input type="number" min={1} value={cost} onChange={(e) => setCost(+e.target.value)} className="mt-1 h-12 text-base" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 h-12 text-base" onClick={async () => {
                if (!title.trim()) return;
                await choresApi.addReward({ title: title.trim(), icon, pointsCost: cost });
                setTitle(""); setShowAdd(false); refresh();
                toast.success("Reward added");
              }}>Add Reward</Button>
              <Button variant="outline" className="h-12 px-4" onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {(data.rewards || []).map((reward: Reward) => (
          <Card key={reward.id}>
            <CardContent className="p-4 flex items-center gap-3 min-h-[64px]">
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-base">{reward.title}</div>
                <div className="text-[15px] text-muted-foreground">{reward.pointsCost} points</div>
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11 text-destructive" onClick={async () => {
                await choresApi.deleteReward(reward.id);
                refresh();
                toast.success("Reward deleted");
              }}>
                <Trash2 className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ── Leaderboard & History Tab ──
function LeaderboardTab({ data, refresh }: any) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kidStats = data.kids.map((kid: Kid) => {
    const total = getKidTotalPoints(kid.id, data.logs, data.chores);
    const weekly = getKidWeeklyPoints(kid.id, data.logs, data.chores);
    const streak = getKidStreak(kid.id, data.logs);
    const level = getKidLevel(total);
    const choresDone = data.logs.filter((l: any) => l.kidId === kid.id && !l.undoneAt).length;
    return { kid, total, weekly, streak, level, choresDone };
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
              <span className="font-bold text-base">{stat.weekly} pts</span>
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
                <div className="flex items-center gap-2">
                   <span className="font-semibold text-base" style={{ color: stat.kid.color }}>{stat.kid.name}</span>
                  <span className="text-sm bg-secondary px-1.5 py-0.5 rounded">
                    {stat.level.icon} {stat.level.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-muted-foreground mt-0.5">
                  <span>🏆 {stat.total}</span>
                  <span>✅ {stat.choresDone}</span>
                  <span>🔥 {stat.streak}d</span>
                </div>
                {stat.level.nextLevel && (
                  <Progress value={stat.level.progress} className="h-1.5 mt-1.5" />
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
                    <span className="text-lg">{chore?.icon}</span>
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
                          <span className="text-muted-foreground text-sm">Difficulty</span>
                          <div className="font-medium">{"⭐".repeat(chore?.difficulty || 1)}</div>
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
  const pendingGradeSubs: GradeSubmission[] = (data.gradeSubmissions || []).filter(
    (s: GradeSubmission) => s.status === "pending"
  );
  const gradeScale: GradeScaleEntry[] = data.settings?.gradeScale || [];

  const totalPending = pendingLogs.length + pendingSubmissions.length + pendingGradeSubs.length;

  return (
    <>
      <h2 className="text-xl font-semibold">Pending Approvals ({totalPending})</h2>
      {totalPending === 0 && (
        <p className="text-base text-muted-foreground">No pending approvals 🎉</p>
      )}

      {pendingSubmissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-medium text-muted-foreground">📤 Kid Submissions</h3>
          {pendingSubmissions.map((sub: ChoreSubmission) => {
            const kid = data.kids.find((k: Kid) => k.id === sub.kidId);
            return (
              <Card key={sub.id} className="border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Send className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{sub.title}</div>
                      <div className="text-[15px] text-muted-foreground mt-0.5">
                        By {kid && <KidAvatar kid={kid} size={18} />} {kid?.name} • {new Date(sub.submittedAt).toLocaleString()}
                      </div>
                      {sub.note && <div className="text-[15px] text-muted-foreground mt-1">📝 {sub.note}</div>}
                      {sub.photoUrl && (
                        <PhotoThumbnail src={sub.photoUrl} onClick={() => setLightboxPhoto(sub.photoUrl!)} />
                      )}
                      {rejectingId === sub.id && (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)..."
                            className="h-12 text-base"
                          />
                          <div className="flex gap-2">
                            <Button className="flex-1 h-12" variant="destructive" onClick={async () => {
                              await choresApi.rejectSubmission(sub.id, rejectReason);
                              refresh();
                              setRejectingId(null);
                              setRejectReason("");
                              toast.success("Rejected");
                            }}>
                              Confirm Reject
                            </Button>
                            <Button className="h-12" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {rejectingId !== sub.id && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] text-muted-foreground">Points:</span>
                        <select
                          className="h-12 w-20 rounded-md border border-input bg-background px-2 text-base"
                          defaultValue={5}
                          id={`pts-${sub.id}`}
                        >
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 h-12 text-base" onClick={async () => {
                          const sel = document.getElementById(`pts-${sub.id}`) as HTMLSelectElement;
                          const pts = parseInt(sel?.value) || 5;
                          await choresApi.approveSubmission(sub.id, pts);
                          refresh();
                          toast.success(`Approved! +${pts}pts`);
                        }}>
                          <Check className="w-5 h-5 mr-2" /> Approve
                        </Button>
                        <Button className="h-12 text-base" variant="outline" onClick={() => setRejectingId(sub.id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Grade Submissions */}
      {pendingGradeSubs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-medium text-muted-foreground">📝 Grade Submissions</h3>
          {pendingGradeSubs.map((sub: GradeSubmission) => {
            const kid = data.kids.find((k: Kid) => k.id === sub.kidId);
            const scaleEntry = gradeScale.find((s: GradeScaleEntry) => s.label === sub.grade);
            const suggestedPoints = scaleEntry?.pointsReward ?? 0;
            return (
              <Card key={sub.id} className="border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{sub.subject} — <span className="text-primary">{sub.grade}</span></div>
                      <div className="text-[15px] text-muted-foreground mt-0.5">
                        {sub.type === "term" ? "📋 Term" : "📄 Exam"} • By {kid && <KidAvatar kid={kid} size={18} />} {kid?.name} • {new Date(sub.submittedAt).toLocaleString()}
                      </div>
                      {sub.term && <div className="text-[15px] text-muted-foreground">Term: {sub.term}</div>}
                      {sub.photoUrl && (
                        <PhotoThumbnail src={sub.photoUrl} onClick={() => setLightboxPhoto(sub.photoUrl!)} />
                      )}
                      {rejectingId === sub.id && (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)..."
                            className="h-12 text-base"
                          />
                          <div className="flex gap-2">
                            <Button className="flex-1 h-12" variant="destructive" onClick={async () => {
                              await choresApi.rejectGradeSubmission(sub.id, rejectReason);
                              refresh();
                              setRejectingId(null);
                              setRejectReason("");
                              toast.success("Rejected");
                            }}>
                              Confirm Reject
                            </Button>
                            <Button className="h-12" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {rejectingId !== sub.id && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] text-muted-foreground">Points:</span>
                        <select
                          className="h-12 w-24 rounded-md border border-input bg-background px-2 text-base"
                          defaultValue={suggestedPoints}
                          id={`grade-pts-${sub.id}`}
                        >
                          {[0,5,10,15,20,25,30,40,50].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        {suggestedPoints > 0 && (
                          <span className="text-xs text-muted-foreground">(scale: {suggestedPoints})</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 h-12 text-base" onClick={async () => {
                          const sel = document.getElementById(`grade-pts-${sub.id}`) as HTMLSelectElement;
                          const pts = parseInt(sel?.value) || 0;
                          await choresApi.approveGradeSubmission(sub.id, pts);
                          refresh();
                          toast.success(`Grade approved!${pts > 0 ? ` +${pts}pts` : ""}`);
                        }}>
                          <Check className="w-5 h-5 mr-2" /> Approve
                        </Button>
                        <Button className="h-12 text-base" variant="outline" onClick={() => setRejectingId(sub.id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pendingLogs.length > 0 && (
        <div className="space-y-2">
          {pendingSubmissions.length > 0 && <h3 className="text-base font-medium text-muted-foreground">📋 Chore Completions</h3>}
          {pendingLogs.map((log: any) => {
            const chore = data.chores.find((c: Chore) => c.id === log.choreId);
            const kid = data.kids.find((k: Kid) => k.id === log.kidId);
            return (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 min-h-[56px]">
                    <span className="text-2xl">{chore?.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-base">{chore?.title}</div>
                      <div className="text-[15px] text-muted-foreground">
                        By {kid && <KidAvatar kid={kid} size={18} />} {kid?.name} • {new Date(log.completedAt).toLocaleString()}
                      </div>
                      {log.photoUrl && (
                        <PhotoThumbnail src={log.photoUrl} onClick={() => setLightboxPhoto(log.photoUrl)} />
                      )}
                    </div>
                  </div>
                  <Button className="w-full h-12 text-base mt-3" onClick={async () => {
                    await choresApi.approveChore(log.id);
                    refresh();
                    toast.success("Approved!");
                  }}>
                    <Check className="w-5 h-5 mr-2" /> Approve
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


// ── Settings Tab ──
function SettingsTab({ data, refresh, showAddKid, setShowAddKid }: any) {
  const settings = data.settings || DEFAULT_SETTINGS;
  const [rotationEnabled, setRotationEnabled] = useState(settings.rotationEnabled ?? false);
  const [showSuggestions, setShowSuggestions] = useState(settings.showSuggestions ?? true);
  const [categoriesEnabled, setCategoriesEnabled] = useState(settings.categoriesEnabled ?? false);
  const [categories, setCategories] = useState<string[]>(settings.categories || DEFAULT_SETTINGS.categories);
  const [newCategory, setNewCategory] = useState("");
  const [streakBonuses, setStreakBonuses] = useState<{ id: string; daysRequired: number; multiplier: number }[]>(settings.streakBonuses || []);
  const [newStreakDays, setNewStreakDays] = useState(7);
  const [newStreakMultiplier, setNewStreakMultiplier] = useState(2);
  const [notifyParentOnComplete, setNotifyParentOnComplete] = useState(settings.notifyParentOnComplete ?? true);
  const [notifyKidOnNewChore, setNotifyKidOnNewChore] = useState(settings.notifyKidOnNewChore ?? true);
  const [gradesEnabled, setGradesEnabled] = useState(settings.gradesEnabled ?? false);
  const [gradeScale, setGradeScale] = useState(settings.gradeScale || DEFAULT_GRADE_SCALE);
  const [gradeSubjects, setGradeSubjects] = useState<string[]>(settings.gradeSubjects || DEFAULT_SUBJECTS);
  const [newSubject, setNewSubject] = useState("");
  const [newGradeLabel, setNewGradeLabel] = useState("");
  const [newGradePoints, setNewGradePoints] = useState(0);

  const saveSettings = async (partial: any) => {
    const updated = { ...settings, ...partial };
    await choresApi.updateSettings(updated);
    refresh();
    toast.success("Settings saved");
  };

  return (
    <>
      <h2 className="text-xl font-semibold">⚙️ Settings</h2>

      {/* Kids Management Section */}
      <KidsTab data={data} refresh={refresh} showAdd={showAddKid} setShowAdd={setShowAddKid} />

      <Card>
        <CardContent className="p-4 space-y-4">
          <Label className="text-[15px] font-semibold">🔔 Notifications</Label>

          <div className="space-y-2">
            <PushNotificationToggle role="parent" />
          </div>

          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px]">Notify me when kid completes</Label>
              <p className="text-[15px] text-muted-foreground">Push when a chore is done</p>
            </div>
            <Switch checked={notifyParentOnComplete} onCheckedChange={(v) => {
              setNotifyParentOnComplete(v);
              saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories, streakBonuses, notifyParentOnComplete: v, notifyKidOnNewChore });
            }} />
          </div>

          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px]">Notify kids on new chore</Label>
              <p className="text-[15px] text-muted-foreground">Kids get a push for new chores</p>
            </div>
            <Switch checked={notifyKidOnNewChore} onCheckedChange={(v) => {
              setNotifyKidOnNewChore(v);
              saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories, streakBonuses, notifyParentOnComplete, notifyKidOnNewChore: v });
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">🔄 Chore Rotation</Label>
              <p className="text-[15px] text-muted-foreground">Auto-assign in rotating order</p>
            </div>
            <Switch checked={rotationEnabled} onCheckedChange={(v) => {
              setRotationEnabled(v);
              saveSettings({ rotationEnabled: v, showSuggestions, categoriesEnabled, categories, streakBonuses });
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">💡 Kid Suggestions</Label>
              <p className="text-[15px] text-muted-foreground">Show suggested assignments</p>
            </div>
            <Switch checked={showSuggestions} onCheckedChange={(v) => {
              setShowSuggestions(v);
              saveSettings({ rotationEnabled, showSuggestions: v, categoriesEnabled, categories, streakBonuses });
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">🏷️ Categories</Label>
              <p className="text-[15px] text-muted-foreground">Tag and filter chores</p>
            </div>
            <Switch checked={categoriesEnabled} onCheckedChange={(v) => {
              setCategoriesEnabled(v);
              saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled: v, categories, streakBonuses });
            }} />
          </div>
          {categoriesEnabled && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5 bg-secondary px-3 py-2 rounded text-sm min-h-[40px]">
                    <span>{cat}</span>
                    <button onClick={() => {
                      const updated = categories.filter((c) => c !== cat);
                      setCategories(updated);
                      saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories: updated, streakBonuses });
                    }} className="text-destructive hover:text-destructive/80">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="flex-1 h-12 text-base" />
                <Button className="h-12 px-4 text-base" onClick={() => {
                  if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
                  const updated = [...categories, newCategory.trim()];
                  setCategories(updated);
                  setNewCategory("");
                  saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories: updated, streakBonuses });
                }}>Add</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-[15px] font-semibold">🔥 Streak Bonuses</Label>
          <p className="text-[15px] text-muted-foreground">Multiply points after consecutive days</p>

          {streakBonuses.sort((a, b) => a.daysRequired - b.daysRequired).map((sb) => (
            <div key={sb.id} className="flex items-center gap-2 text-[15px] bg-secondary/50 px-4 py-3 rounded-lg min-h-[48px]">
              <span className="flex-1">
                After {sb.daysRequired} days → {sb.multiplier}x points
              </span>
              <button onClick={() => {
                const updated = streakBonuses.filter((b) => b.id !== sb.id);
                setStreakBonuses(updated);
                saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories, streakBonuses: updated });
              }} className="text-destructive min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Days streak</Label>
              <Input type="number" min={1} value={newStreakDays} onChange={(e) => setNewStreakDays(+e.target.value)} className="mt-1 h-12 text-base" />
            </div>
            <div>
              <Label className="text-sm">Multiplier</Label>
              <Input type="number" min={1.5} step={0.5} value={newStreakMultiplier} onChange={(e) => setNewStreakMultiplier(+e.target.value)} className="mt-1 h-12 text-base" />
            </div>
          </div>
          <Button className="w-full h-12 text-base" onClick={() => {
            if (newStreakDays < 1 || newStreakMultiplier < 1) return;
            const sb = {
              id: `sb_${Date.now()}`,
              daysRequired: newStreakDays,
              multiplier: newStreakMultiplier,
            };
            const updated = [...streakBonuses, sb];
            setStreakBonuses(updated);
            saveSettings({ rotationEnabled, showSuggestions, categoriesEnabled, categories, streakBonuses: updated });
          }}>
            <Plus className="w-5 h-5 mr-2" /> Add Streak Bonus
          </Button>
        </CardContent>
      </Card>

      {/* Grades Settings */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">📝 School Grades</Label>
              <p className="text-[15px] text-muted-foreground">Track exam & term grades</p>
            </div>
            <Switch checked={gradesEnabled} onCheckedChange={(v) => {
              setGradesEnabled(v);
              saveSettings({ gradesEnabled: v, gradeScale, gradeSubjects });
            }} />
          </div>

          {gradesEnabled && (
            <>
              {/* Grade Scale */}
              <div className="space-y-2">
                <Label className="text-[15px] font-semibold">📊 Grade Scale</Label>
                {gradeScale.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-secondary/50 px-4 py-3 rounded-lg min-h-[48px]">
                    <span className="font-bold text-base w-10">{entry.label}</span>
                    <span className="flex-1 text-sm text-muted-foreground">→ {entry.pointsReward} pts</span>
                    <button onClick={() => {
                      const updated = gradeScale.filter((_: any, i: number) => i !== idx);
                      setGradeScale(updated);
                      saveSettings({ gradesEnabled, gradeScale: updated, gradeSubjects });
                    }} className="text-destructive min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  <Input value={newGradeLabel} onChange={(e) => setNewGradeLabel(e.target.value)} placeholder="Label" className="h-12 text-base" />
                  <Input type="number" min={0} value={newGradePoints} onChange={(e) => setNewGradePoints(+e.target.value)} placeholder="Points" className="h-12 text-base" />
                  <Button className="h-12 text-base" onClick={() => {
                    if (!newGradeLabel.trim()) return;
                    const updated = [...gradeScale, { label: newGradeLabel.trim(), pointsReward: newGradePoints }];
                    setGradeScale(updated);
                    setNewGradeLabel("");
                    setNewGradePoints(0);
                    saveSettings({ gradesEnabled, gradeScale: updated, gradeSubjects });
                  }}>Add</Button>
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-2">
                <Label className="text-[15px] font-semibold">📚 Subjects</Label>
                <div className="flex flex-wrap gap-1.5">
                  {gradeSubjects.map((subj: string) => (
                    <div key={subj} className="flex items-center gap-1.5 bg-secondary px-3 py-2 rounded text-sm min-h-[40px]">
                      <span>{subj}</span>
                      <button onClick={() => {
                        const updated = gradeSubjects.filter((s: string) => s !== subj);
                        setGradeSubjects(updated);
                        saveSettings({ gradesEnabled, gradeScale, gradeSubjects: updated });
                      }} className="text-destructive hover:text-destructive/80">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="New subject" className="flex-1 h-12 text-base" />
                  <Button className="h-12 px-4 text-base" onClick={() => {
                    if (!newSubject.trim() || gradeSubjects.includes(newSubject.trim())) return;
                    const updated = [...gradeSubjects, newSubject.trim()];
                    setGradeSubjects(updated);
                    setNewSubject("");
                    saveSettings({ gradesEnabled, gradeScale, gradeSubjects: updated });
                  }}>Add</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
