import { useState } from "react";
import { Icon } from "@iconify/react";
import type { ActionWidgetConfig, ActionButtonConfig, HAState } from "@/lib/config";
import { runAction } from "@/lib/actions";

function toIconName(name: string): string {
  if (!name) return "mdi:gesture-tap-button";
  return name.includes(":") ? name : `mdi:${name}`;
}

interface Props {
  config: ActionWidgetConfig;
  getState?: (entityId: string) => HAState | undefined;
  compact?: boolean;
}

export default function ActionWidget({ config, getState, compact }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  const handleClick = async (btn: ActionButtonConfig) => {
    if (btn.confirm && !window.confirm(`Run "${btn.label}"?`)) return;
    setPending(btn.id);
    try {
      await runAction(btn.action);
    } catch {
      // toast handled in runAction
    } finally {
      setTimeout(() => setPending((p) => (p === btn.id ? null : p)), 400);
    }
  };

  const cols = Math.max(1, Math.min(6, config.columns || 2));
  const buttons = config.buttons || [];

  return (
    <div className="widget-card h-full flex flex-col">
      {config.label && (
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          {config.label}
        </div>
      )}
      <div
        className="flex-1 grid gap-2 min-h-0"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {buttons.map((btn) => {
          const active = btn.stateEntityId && getState
            ? ["on", "open", "home", "playing", "heat", "cool"].includes(
                String(getState(btn.stateEntityId)?.state || "").toLowerCase(),
              )
            : false;
          const isPending = pending === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => handleClick(btn)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all active:scale-95 ${active ? "ring-2 ring-primary/60" : ""} ${isPending ? "opacity-60" : ""}`}
              style={{
                padding: compact ? "10px 6px" : "14px 8px",
                minHeight: compact ? 56 : 72,
                color: btn.color || undefined,
              }}
            >
              <Icon
                icon={toIconName(btn.icon)}
                style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, color: btn.color || undefined }}
              />
              <span className="text-[11px] text-foreground/90 leading-tight text-center break-words max-w-full">
                {btn.label}
              </span>
            </button>
          );
        })}
        {buttons.length === 0 && (
          <div className="col-span-full text-[11px] text-muted-foreground text-center py-4">
            No actions configured
          </div>
        )}
      </div>
    </div>
  );
}
