import { useEffect, useMemo, useState } from "react";
import { useManifest } from "@/hooks/useManifest";
import { useDashboardConfig } from "@/hooks/useDashboardData";
import { useHAWebSocket } from "@/hooks/useHAWebSocket";
import { useGeneralSensorData } from "@/hooks/useGeneralSensorData";
import { useSensorGridData } from "@/hooks/useSensorGridData";
import { resolveFontSizes } from "@/lib/fontSizes";
import { runAction } from "@/lib/actions";
import SensorGridWidget from "@/components/SensorGridWidget";
import GeneralSensorWidget from "@/components/GeneralSensorWidget";
import ActionWidget from "@/components/ActionWidget";
import CameraGridWidget from "@/components/CameraGridWidget";
import { ChevronDown, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function MobilePage() {
  useManifest("/manifest-mobile.json", "/icon-mobile.png", "HomeDash Mobile");
  const { config } = useDashboardConfig();
  const { getState: getCachedState, onStateChange } = useHAWebSocket(config);
  const { dataMap: generalData, loading: generalLoading } = useGeneralSensorData(config, getCachedState, onStateChange);
  const { dataMap: gridData, loading: gridLoading } = useSensorGridData(config, getCachedState, onStateChange);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme || "midnight-teal");
  }, [config.theme]);

  const sections = config.mobileLayout?.sections || [];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.filter((s) => s.collapsed).map((s) => [s.id, true])),
  );

  const fs = useMemo(() => resolveFontSizes(config.globalFontSizes, {}), [config.globalFontSizes]);

  const handleCellAction = (cell: { action?: any; confirmAction?: boolean; label?: string }) => {
    if (!cell.action) return;
    if (cell.confirmAction && !window.confirm(`Run action for "${cell.label || ""}"?`)) return;
    runAction(cell.action);
  };
  const handleInfoAction = (item: { action: any; confirmAction?: boolean; label?: string }) => {
    if (item.confirmAction && !window.confirm(`Run action for "${item.label || ""}"?`)) return;
    runAction(item.action);
  };

  const renderItem = (kind: string, refId: string, key: string) => {
    if (kind === "sensorGrid") {
      const grid = (config.sensorGrids || []).find((g) => g.id === refId);
      if (!grid) return <div key={key} className="text-xs text-muted-foreground">Missing grid: {refId}</div>;
      return (
        <SensorGridWidget
          key={key}
          config={grid}
          data={gridData[refId]}
          loading={gridLoading}
          fontSizes={fs}
          onCellAction={handleCellAction}
        />
      );
    }
    if (kind === "generalSensor") {
      const gs = (config.generalSensors || []).find((g) => g.id === refId);
      if (!gs) return <div key={key} className="text-xs text-muted-foreground">Missing sensor: {refId}</div>;
      return (
        <GeneralSensorWidget
          key={key}
          config={gs}
          data={generalData[refId]}
          loading={generalLoading}
          fontSizes={fs}
          onInfoAction={handleInfoAction}
          onHeaderAction={gs.headerAction ? () => {
            if (gs.confirmAction && !window.confirm(`Run action for "${gs.label}"?`)) return;
            runAction(gs.headerAction!);
          } : undefined}
        />
      );
    }
    if (kind === "actionWidget") {
      const aw = (config.actionWidgets || []).find((a) => a.id === refId);
      if (!aw) return <div key={key} className="text-xs text-muted-foreground">Missing action widget: {refId}</div>;
      return <ActionWidget key={key} config={aw} getState={getCachedState} compact />;
    }
    if (kind === "cameraGrid") {
      const cg = (config.cameraGrids || []).find((c) => c.id === refId);
      if (!cg) return <div key={key} className="text-xs text-muted-foreground">Missing camera grid: {refId}</div>;
      return <CameraGridWidget key={key} config={cg} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative" style={{ padding: "8px" }}>
      <WallpaperBackground wallpaper={config.wallpaper} context="mobile" />

      <header className="flex items-center justify-between mb-3 px-1">
        <h1 className="text-base font-semibold tracking-tight">HomeDash</h1>
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1" aria-label="Dashboard">
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </header>

      {sections.length === 0 && (
        <div className="mt-12 text-center px-6">
          <p className="text-sm text-muted-foreground mb-2">No mobile layout configured.</p>
          <p className="text-xs text-muted-foreground">
            Open Settings → Mobile on the desktop dashboard to add sections.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((sec) => {
          const isCollapsed = collapsed[sec.id];
          return (
            <section key={sec.id} className="flex flex-col gap-2">
              {sec.title && (
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
                  className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {sec.title}
                </button>
              )}
              {!isCollapsed && (
                <div className="flex flex-col gap-2">
                  {(sec.items || []).map((it, i) => renderItem(it.kind, it.refId, `${sec.id}_${i}`))}
                  {(!sec.items || sec.items.length === 0) && (
                    <div className="text-[11px] text-muted-foreground px-2">Empty section</div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
