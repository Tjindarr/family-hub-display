import { useState, useEffect } from "react";
import { choresApi } from "@/lib/chores-api";
import { DEFAULT_SETTINGS, DEFAULT_GRADE_SCALE, DEFAULT_SUBJECTS } from "@/lib/chores-types";
import type { GradeScaleEntry } from "@/lib/chores-types";
import type { ChoreReminderConfig } from "@/lib/config";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { KidsTab } from "./KidsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, X, Send } from "lucide-react";
import { toast } from "sonner";

export function SettingsTab({ data, refresh, showAddKid, setShowAddKid }: any) {
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

  // Reminder config (stored in dashboard config)
  const [reminderConfig, setReminderConfig] = useState<ChoreReminderConfig>({
    enabled: false, weekdayHour: 16, weekendHour: 10, maxChoresInNotification: 3,
    streakReminderEnabled: false, streakReminderHour: 18,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Stockholm",
  });
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(cfg => {
      if (cfg.choreReminderConfig) setReminderConfig(prev => ({ ...prev, ...cfg.choreReminderConfig }));
    }).catch(() => {});
  }, []);

  const saveReminderConfig = async (updated: ChoreReminderConfig) => {
    setReminderConfig(updated);
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, choreReminderConfig: updated }),
      });
      toast.success("Reminder settings saved");
    } catch {
      toast.error("Failed to save reminder settings");
    }
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "parent" }),
      });
      if (res.ok) toast.success("Test notification sent!");
      else toast.error("Failed to send test notification");
    } catch {
      toast.error("Failed to send test notification");
    }
    setTestingPush(false);
  };

  const saveSettings = async (partial: any) => {
    const updated = { ...settings, ...partial };
    await choresApi.updateSettings(updated);
    refresh();
    toast.success("Settings saved");
  };

  return (
    <>
      <h2 className="text-xl font-semibold">⚙️ Settings</h2>

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

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-2"
            onClick={sendTestPush}
            disabled={testingPush}
          >
            <Send className="w-4 h-4" />
            {testingPush ? "Sending..." : "Send Test Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Daily Reminder */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">⏰ Daily Chore Reminder</Label>
              <p className="text-[15px] text-muted-foreground">Push notification to kids listing today's chores</p>
            </div>
            <Switch checked={reminderConfig.enabled} onCheckedChange={(v) => saveReminderConfig({ ...reminderConfig, enabled: v })} />
          </div>

          {reminderConfig.enabled && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Timezone</Label>
                <Input value={reminderConfig.timezone}
                  onChange={(e) => saveReminderConfig({ ...reminderConfig, timezone: e.target.value })}
                  placeholder="Europe/Stockholm"
                  className="mt-1 h-12 text-base" />
                <p className="text-xs text-muted-foreground mt-1">IANA timezone (e.g. Europe/Stockholm, America/New_York)</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Weekday hour</Label>
                  <Input type="number" min={0} max={23} value={reminderConfig.weekdayHour}
                    onChange={(e) => saveReminderConfig({ ...reminderConfig, weekdayHour: parseInt(e.target.value) || 0 })}
                    className="mt-1 h-12 text-base" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Weekend hour</Label>
                  <Input type="number" min={0} max={23} value={reminderConfig.weekendHour}
                    onChange={(e) => saveReminderConfig({ ...reminderConfig, weekendHour: parseInt(e.target.value) || 0 })}
                    className="mt-1 h-12 text-base" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Max shown</Label>
                  <Input type="number" min={1} max={10} value={reminderConfig.maxChoresInNotification}
                    onChange={(e) => saveReminderConfig({ ...reminderConfig, maxChoresInNotification: parseInt(e.target.value) || 3 })}
                    className="mt-1 h-12 text-base" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak Reminder */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between min-h-[52px] gap-3">
            <div className="flex-1">
              <Label className="text-[15px] font-semibold">🔥 Streak Reminder</Label>
              <p className="text-[15px] text-muted-foreground">Remind kids to keep their streak alive</p>
            </div>
            <Switch checked={reminderConfig.streakReminderEnabled} onCheckedChange={(v) => saveReminderConfig({ ...reminderConfig, streakReminderEnabled: v })} />
          </div>

          {reminderConfig.streakReminderEnabled && (
            <div className="w-1/2">
              <Label className="text-sm text-muted-foreground">Reminder hour</Label>
              <Input type="number" min={0} max={23} value={reminderConfig.streakReminderHour}
                onChange={(e) => saveReminderConfig({ ...reminderConfig, streakReminderHour: parseInt(e.target.value) || 18 })}
                className="mt-1 h-12 text-base" />
            </div>
          )}
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
