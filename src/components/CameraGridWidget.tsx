import { useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import type { CameraGridConfig } from "@/lib/config";

interface Props {
  config: CameraGridConfig;
}

function buildSrc(entityId: string, ts: number): string {
  if (!entityId) return "";
  return `/api/ha/camera_proxy/${encodeURIComponent(entityId)}?t=${ts}`;
}

function aspectToPadding(ar?: string): string {
  switch (ar) {
    case "4:3": return "75%";
    case "1:1": return "100%";
    case "3:2": return "66.66%";
    case "16:9":
    default: return "56.25%";
  }
}

export default function CameraGridWidget({ config }: Props) {
  const interval = Math.max(2, config.refreshSeconds || 30);
  const cols = Math.max(1, Math.min(6, config.columns || 2));
  const cameras = config.cameras || [];
  const [tick, setTick] = useState<number>(() => Date.now());
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (cameras.length === 0) return;
    timerRef.current = window.setInterval(() => setTick(Date.now()), interval * 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [interval, cameras.length]);

  const padTop = aspectToPadding(config.aspectRatio);

  return (
    <div className="widget-card h-full flex flex-col">
      {config.label && (
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>{config.label}</span>
          <button
            onClick={() => setTick(Date.now())}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh now"
          >
            <Icon icon="mdi:refresh" style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}
      <div
        className="flex-1 grid gap-1.5 min-h-0"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cameras.map((cam, i) => (
          <button
            key={i}
            onClick={() => cam.entityId && setFullscreen(cam.entityId)}
            className="relative rounded-lg overflow-hidden bg-muted/40 group"
            style={{ paddingTop: padTop }}
            title={cam.label || cam.entityId}
          >
            {cam.entityId ? (
              <img
                src={buildSrc(cam.entityId, tick)}
                alt={cam.label || cam.entityId}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Icon icon="mdi:cctv-off" style={{ width: 24, height: 24 }} />
              </div>
            )}
            {cam.label && (
              <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 text-[10px] bg-black/50 text-white text-left truncate">
                {cam.label}
              </div>
            )}
          </button>
        ))}
        {cameras.length === 0 && (
          <div className="col-span-full text-[11px] text-muted-foreground text-center py-4">
            No cameras configured
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <img
            src={buildSrc(fullscreen, tick)}
            alt={fullscreen}
            className="max-w-full max-h-full object-contain rounded"
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setFullscreen(null); }}
          >
            <Icon icon="mdi:close" style={{ width: 28, height: 28 }} />
          </button>
        </div>
      )}
    </div>
  );
}
