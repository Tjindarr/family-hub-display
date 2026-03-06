import { useState } from "react";
import type { Chore, Kid, ChoreSubmission, GradeSubmission, GradeScaleEntry } from "@/lib/chores-types";
import { choresApi } from "@/lib/chores-api";
import { KidAvatar } from "@/components/KidAvatar";
import { PhotoLightbox, PhotoThumbnail } from "@/components/PhotoLightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, Send, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export function ApprovalsTab({ data, refresh }: any) {
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
