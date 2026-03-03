import { useState } from "react";
import { choresApi } from "@/lib/chores-api";
import type { Kid, Grade, GradeType, GradeScaleEntry } from "@/lib/chores-types";
import { DEFAULT_GRADE_SCALE, DEFAULT_SUBJECTS } from "@/lib/chores-types";
import { KidAvatar } from "@/components/KidAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, X, ChevronDown, GraduationCap } from "lucide-react";
import { toast } from "sonner";

interface GradesTabProps {
  data: any;
  refresh: () => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
}

export function GradesTab({ data, refresh, showAdd, setShowAdd }: GradesTabProps) {
  const [filterKid, setFilterKid] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedGradeId, setExpandedGradeId] = useState<string | null>(null);

  const grades: Grade[] = (data.grades || [])
    .filter((g: Grade) => filterKid === "all" || g.kidId === filterKid)
    .filter((g: Grade) => filterType === "all" || g.type === filterType)
    .sort((a: Grade, b: Grade) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const gradeScale: GradeScaleEntry[] = data.settings?.gradeScale || DEFAULT_GRADE_SCALE;
  const subjects: string[] = data.settings?.gradeSubjects || DEFAULT_SUBJECTS;

  return (
    <>
      <h2 className="text-xl font-semibold">📝 Grades ({(data.grades || []).length})</h2>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterKid("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterKid === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >All kids</button>
        {data.kids.map((kid: Kid) => (
          <button
            key={kid.id}
            onClick={() => setFilterKid(kid.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] flex items-center gap-1.5 ${filterKid === kid.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            <KidAvatar kid={kid} size={18} /> {kid.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >All</button>
        <button
          onClick={() => setFilterType("exam")}
          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterType === "exam" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >📄 Exams</button>
        <button
          onClick={() => setFilterType("term")}
          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${filterType === "term" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >📋 Term</button>
      </div>

      {showAdd && (
        <GradeForm
          kids={data.kids}
          gradeScale={gradeScale}
          subjects={subjects}
          onSave={async (grade) => {
            await choresApi.addGrade(grade);
            setShowAdd(false);
            refresh();
            toast.success("Grade added" + (grade.pointsAwarded > 0 ? ` (+${grade.pointsAwarded}pts)` : ""));
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-2">
        {grades.map((grade: Grade) => {
          const kid = data.kids.find((k: Kid) => k.id === grade.kidId);
          const isExpanded = expandedGradeId === grade.id;
          return (
            <Card key={grade.id}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left min-h-[56px]"
                  onClick={() => setExpandedGradeId(isExpanded ? null : grade.id)}
                >
                  <span className="text-2xl">{grade.type === "term" ? "📋" : "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{grade.subject}</span>
                      <span className="text-lg font-bold text-primary">{grade.grade}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[15px] text-muted-foreground mt-0.5">
                      {kid && (
                        <span className="flex items-center gap-1" style={{ color: kid.color }}>
                          <KidAvatar kid={kid} size={16} /> {kid.name}
                        </span>
                      )}
                      <span>{new Date(grade.date).toLocaleDateString()}</span>
                      {grade.term && <span>• {grade.term}</span>}
                      {grade.pointsAwarded > 0 && (
                        <span className="text-primary font-medium">+{grade.pointsAwarded}pts</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 text-[15px] text-muted-foreground flex-wrap pt-3">
                      <span>{grade.type === "term" ? "📋 Term Grade" : "📄 Exam Grade"}</span>
                      {grade.autoAwarded && grade.pointsAwarded > 0 && <span>🤖 Auto-awarded</span>}
                      {!grade.autoAwarded && grade.pointsAwarded > 0 && <span>✋ Manual points</span>}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm text-destructive"
                      onClick={async () => {
                        await choresApi.deleteGrade(grade.id);
                        refresh();
                        toast.success("Grade deleted");
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {grades.length === 0 && (
        <p className="text-center text-muted-foreground text-base py-8">
          No grades recorded yet. Tap + to add one.
        </p>
      )}
    </>
  );
}

// ── Grade Form ──
function GradeForm({ kids, gradeScale, subjects, onSave, onCancel }: {
  kids: Kid[];
  gradeScale: GradeScaleEntry[];
  subjects: string[];
  onSave: (g: any) => void;
  onCancel: () => void;
}) {
  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [type, setType] = useState<GradeType>("exam");
  const [subject, setSubject] = useState(subjects[0] || "");
  const [customSubject, setCustomSubject] = useState("");
  const [grade, setGrade] = useState(gradeScale[0]?.label || "");
  const [term, setTerm] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [autoAward, setAutoAward] = useState(true);
  const [manualPoints, setManualPoints] = useState(0);

  const isCustomSubject = subject === "__custom__";
  const selectedScale = gradeScale.find((s) => s.label === grade);
  const pointsAwarded = autoAward ? (selectedScale?.pointsReward ?? 0) : manualPoints;

  const handleSave = () => {
    const finalSubject = isCustomSubject ? customSubject.trim() : subject;
    if (!finalSubject || !kidId || !grade) {
      toast.error("Fill in all fields");
      return;
    }
    onSave({
      kidId,
      type,
      subject: finalSubject,
      grade,
      term: term.trim() || undefined,
      date,
      pointsAwarded,
      autoAwarded: autoAward,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">📝 Add Grade</h3>
          <button onClick={onCancel}><X className="w-5 h-5" /></button>
        </div>

        <div>
          <Label className="text-[15px]">Kid</Label>
          <Select value={kidId} onValueChange={setKidId}>
            <SelectTrigger className="h-12 text-base mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {kids.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  <span className="flex items-center gap-2">
                    <KidAvatar kid={k} size={18} /> {k.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[15px]">Type</Label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setType("exam")}
              className={`flex-1 py-3 rounded-lg text-base font-medium min-h-[48px] ${type === "exam" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >📄 Exam</button>
            <button
              onClick={() => setType("term")}
              className={`flex-1 py-3 rounded-lg text-base font-medium min-h-[48px] ${type === "term" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >📋 Term</button>
          </div>
        </div>

        <div>
          <Label className="text-[15px]">Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="h-12 text-base mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              <SelectItem value="__custom__">Other...</SelectItem>
            </SelectContent>
          </Select>
          {isCustomSubject && (
            <Input
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Subject name"
              className="h-12 text-base mt-2"
              autoFocus
            />
          )}
        </div>

        <div>
          <Label className="text-[15px]">Grade</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {gradeScale.map((s) => (
              <button
                key={s.label}
                onClick={() => setGrade(s.label)}
                className={`px-5 py-3 rounded-lg text-base font-bold min-h-[48px] min-w-[48px] ${grade === s.label ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {selectedScale && selectedScale.pointsReward > 0 && autoAward && (
            <p className="text-sm text-primary mt-1">→ Auto-awards {selectedScale.pointsReward} pts</p>
          )}
        </div>

        <div>
          <Label className="text-[15px]">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 text-sm mt-1 w-full min-w-0 max-w-full" />
        </div>

        {type === "term" && (
          <div>
            <Label className="text-[15px]">Term / Period</Label>
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Fall 2026, Q1" className="h-12 text-base mt-1" />
          </div>
        )}

        <div className="flex items-center justify-between min-h-[52px] gap-3">
          <div className="flex-1">
            <Label className="text-[15px]">Auto-award points</Label>
            <p className="text-sm text-muted-foreground">Based on grade scale</p>
          </div>
          <Switch checked={autoAward} onCheckedChange={setAutoAward} />
        </div>

        {!autoAward && (
          <div>
            <Label className="text-[15px]">Manual points</Label>
            <Input type="number" min={0} value={manualPoints} onChange={(e) => setManualPoints(+e.target.value)} className="h-12 text-base mt-1" />
          </div>
        )}

        <Button className="w-full h-12 text-base" onClick={handleSave}>
          <Plus className="w-5 h-5 mr-2" /> Add Grade {pointsAwarded > 0 && `(+${pointsAwarded}pts)`}
        </Button>
      </CardContent>
    </Card>
  );
}
