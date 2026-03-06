import { useState } from "react";
import type { Chore, Kid } from "@/lib/chores-types";
import {
  isChoreDueToday, isChoreCompletedToday, suggestFairKid,
  daysUntilDue, TIME_OF_DAY_LABELS, DEFAULT_SETTINGS,
} from "@/lib/chores-types";
import { choresApi } from "@/lib/chores-api";
import { KidAvatar } from "@/components/KidAvatar";
import { ChoreForm } from "./ChoreForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, Edit, Trash2, Shield, Users, Clock, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  data: any;
  refresh: () => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  editingChore: Chore | null;
  setEditingChore: (c: Chore | null) => void;
  showSuggestions: boolean;
}

export function ChoresTab({ data, refresh, showAdd, setShowAdd, editingChore, setEditingChore, showSuggestions }: Props) {
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
