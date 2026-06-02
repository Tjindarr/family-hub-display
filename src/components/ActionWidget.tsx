import { useState } from "react";
import { Icon } from "@iconify/react";
import type { ActionWidgetConfig, ActionButtonConfig, HAState } from "@/lib/config";
import { runAction } from "@/lib/actions";
import { resolveEntityValue } from "@/lib/entity-resolver";

function toIconName(name: string): string {
  if (!name) return "mdi:gesture-tap-button";
  return name.includes(":") ? name : `mdi:${name}`;
}

const DEFAULT_ACTIVE_STATES = ["on", "open", "opening", "home", "playing", "heat", "cool", "active", "unlocked", "true"];

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
          let active = false;
          if (btn.stateEntityId && getState) {
            const ref = btn.stateAttribute ? `${btn.stateEntityId}.${btn.stateAttribute}` : btn.stateEntityId;
            const { value } = resolveEntityValue(ref, getState);
            const v = String(value ?? "").toLowerCase().trim();
            const activeList = (btn.activeStates && btn.activeStates.length > 0)
              ? btn.activeStates.map((s) => s.toLowerCase().trim())
              : DEFAULT_ACTIVE_STATES;
            active = activeList.includes(v);
          }
          const isPending = pending === btn.id;
          const fgColor = btn.stateEntityId
            ? (active ? (btn.activeColor || btn.color) : (btn.inactiveColor || btn.color))
            : btn.color;
          const bgColor = btn.stateEntityId
            ? (active ? btn.activeBgColor : btn.inactiveBgColor)
            : undefined;
          const iconName = active && btn.activeIcon ? btn.activeIcon : btn.icon;
          return (
            <button
              key={btn.id}
              onClick={() => handleClick(btn)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-95 ${bgColor ? "" : "bg-muted/30 hover:bg-muted/60"} ${active && !bgColor ? "ring-2 ring-primary/60" : ""} ${isPending ? "opacity-60" : ""}`}
              style={{
                padding: compact ? "10px 6px" : "14px 8px",
                minHeight: compact ? 56 : 72,
                color: fgColor || undefined,
                backgroundColor: bgColor || undefined,
              }}
            >
              <Icon
                icon={toIconName(iconName)}
                style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, color: fgColor || undefined }}
              />
              <span className="text-[11px] leading-tight text-center break-words max-w-full" style={{ color: fgColor || undefined }}>
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
