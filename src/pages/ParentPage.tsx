import { useState, useEffect } from "react";
import { useManifest } from "@/hooks/useManifest";
import { useChoresData } from "@/hooks/useChoresData";
import type { Chore, ChoreSubmission, GradeSubmission } from "@/lib/chores-types";
import { GradesTab } from "@/components/GradesTab";
import { ChoresTab } from "@/components/parent/ChoresTab";
import { RewardsTab } from "@/components/parent/RewardsTab";
import { LeaderboardTab } from "@/components/parent/LeaderboardTab";
import { ApprovalsTab } from "@/components/parent/ApprovalsTab";
import { SettingsTab } from "@/components/parent/SettingsTab";
import { Plus, Shield, Settings, ClipboardList, BarChart3, Gift, GraduationCap } from "lucide-react";

type Tab = "chores" | "kids" | "rewards" | "approvals" | "leaderboard" | "settings" | "grades";

export default function ParentPage() {
  useManifest("/manifest-parent.json", "/icon-parent.png", "HomeDash Parent");
  const { data, refresh } = useChoresData();
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

  const bottomTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Chores", icon: <ClipboardList className="w-7 h-7" /> },
    { id: "approvals", label: "Approve", icon: <Shield className="w-7 h-7" /> },
    { id: "leaderboard", label: "Board", icon: <BarChart3 className="w-7 h-7" /> },
    { id: "rewards", label: "Rewards", icon: <Gift className="w-7 h-7" /> },
    ...(gradesEnabled ? [{ id: "grades" as Tab, label: "Grades", icon: <GraduationCap className="w-7 h-7" /> }] : []),
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

      {/* FAB */}
      {fabAction && (
        <button
          onClick={fabAction}
          className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t border-border pb-6 pt-1 px-4">
        <div className="max-w-2xl mx-auto flex">
          {bottomTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-medium transition-colors relative ${
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
