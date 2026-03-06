import { useState } from "react";
import type { Reward } from "@/lib/chores-types";
import { choresApi } from "@/lib/chores-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

const REWARD_EMOJIS = ["🎁", "🍕", "🎮", "📱", "🍦", "🎬", "⚽", "🎨", "🏊", "💵"];

export function RewardsTab({ data, refresh, showAdd, setShowAdd }: any) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState(50);

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
