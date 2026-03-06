import { useState } from "react";
import type { Chore, Kid, ChoreRecurrence, TimeOfDay, RecurrenceType } from "@/lib/chores-types";
import { TIME_OF_DAY_LABELS, WEEKDAY_LABELS } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

const EMOJI_OPTIONS = ["🧹", "🧽", "🍽️", "🛏️", "🗑️", "🐕", "🌿", "📚", "👕", "🚗", "🧺", "🪣", "✨", "🏠", "🍳"];

interface Props {
  chore?: Chore | null;
  categories: string[];
  categoriesEnabled: boolean;
  kids: Kid[];
  rotationEnabled: boolean;
  onSave: (c: any) => void;
  onCancel: () => void;
}

export function ChoreForm({ chore, categories, categoriesEnabled, kids, rotationEnabled, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(chore?.title ?? "");
  const [icon, setIcon] = useState(chore?.icon ?? "🧹");
  const [points, setPoints] = useState(chore?.points ?? 1);
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
  const [completionNote, setCompletionNote] = useState(chore?.completionNote ?? "");

  const handleSubmit = () => {
    if (!title.trim()) return;
    const recurrence: ChoreRecurrence = { type: recType };
    if (recType === "interval") recurrence.intervalDays = intervalDays;
    if (recType === "weekly") recurrence.weekdays = weekdays;
    onSave({
      title: title.trim(), icon, points, difficulty: 1, timeOfDay,
      recurrence, requirePhoto, requireApproval, paused: chore?.paused ?? false,
      perKid: perKid || undefined,
      category: category || undefined,
      deadline: deadline || undefined,
      earlyBonus: earlyBonus > 0 ? earlyBonus : undefined,
      rotationKids: rotationKids.length > 0 ? rotationKids : undefined,
      completionNote: completionNote.trim() || undefined,
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

        <div>
          <Label className="text-sm font-medium">Completion popup (optional)</Label>
          <Input value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} placeholder="e.g. Also wipe the stove!" className="mt-1 h-12 text-base" />
          <p className="text-xs text-muted-foreground mt-1">Shows a confirmation popup when a kid marks this done</p>
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
