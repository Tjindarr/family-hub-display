import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { useManifest } from "@/hooks/useManifest";
import {
  useDashboardConfig,
  useTemperatureData,
  useCalendarData,
  useElectricityPrices,
  usePersonData,
  useWeatherData,
  useFoodMenuData,
} from "@/hooks/useDashboardData";
import { useHAWebSocket } from "@/hooks/useHAWebSocket";
import { useGeneralSensorData } from "@/hooks/useGeneralSensorData";
import { useSensorGridData } from "@/hooks/useSensorGridData";
import { useRssNews } from "@/hooks/useRssNews";
import { useNotificationData } from "@/hooks/useNotificationData";
import { useVehicleData } from "@/hooks/useVehicleData";
import { usePollenData } from "@/hooks/usePollenData";
import { resolveFontSizes } from "@/lib/fontSizes";
import { runAction } from "@/lib/actions";

import SensorGridWidget from "@/components/SensorGridWidget";
import GeneralSensorWidget from "@/components/GeneralSensorWidget";
import ActionWidget from "@/components/ActionWidget";
import CameraGridWidget from "@/components/CameraGridWidget";
import WallpaperBackground from "@/components/WallpaperBackground";
import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import PhotoWidget from "@/components/PhotoWidget";
import PersonWidget from "@/components/PersonWidget";
import WeatherWidget from "@/components/WeatherWidget";
import FoodMenuWidget from "@/components/FoodMenuWidget";
import RssNewsWidget from "@/components/RssNewsWidget";
import NotificationWidget from "@/components/NotificationWidget";
import VehicleWidget from "@/components/VehicleWidget";
import PollenWidget from "@/components/PollenWidget";
import ChoreWidget from "@/components/ChoreWidget";

import { Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { MobileDashboardConfig, DashboardConfig } from "@/lib/config";

const ConfigPanel = lazy(() => import("@/components/ConfigPanel"));
const DashboardEditOverlay = lazy(() => import("@/components/DashboardEditOverlay"));

const DEFAULT_MOBILE_DASH: MobileDashboardConfig = {
  gridColumns: 2,
  widgetOrder: [],
  widgetLayouts: {},
  rowColumns: {},
  rowHeights: {},
  lockWidgetHeights: false,
  generalSensors: [],
  sensorGrids: [],
  actionWidgets: [],
  cameraGrids: [],
  rssFeeds: [],
  vehicles: [],
};

// Migrate legacy mobileLayout.sections into widgetOrder when mobileDashboard is empty
function migrateLegacy(config: DashboardConfig): string[] {
  const sections = config.mobileLayout?.sections || [];
  const order: string[] = [];
  for (const sec of sections) {
    for (const it of sec.items || []) {
      if (!it.refId && it.kind !== "widget") continue;
      if (it.kind === "sensorGrid") order.push(`sensorgrid_${it.refId}`);
      else if (it.kind === "generalSensor") order.push(`general_${it.refId}`);
      else if (it.kind === "actionWidget") order.push(`action_${it.refId}`);
      else if (it.kind === "cameraGrid") order.push(`cameragrid_${it.refId}`);
      else if (it.kind === "widget") order.push(it.refId);
    }
  }
  return order;
}

export default function MobilePage() {
  useManifest("/manifest-mobile.json", "/icon-mobile.png", "HomeDash Mobile");
  const { config, updateConfig } = useDashboardConfig();

  // Effective mobile dashboard slice (with legacy migration fallback)
  const mobileDash: MobileDashboardConfig = useMemo(() => {
    const md = { ...DEFAULT_MOBILE_DASH, ...(config.mobileDashboard || {}) };
    if ((!md.widgetOrder || md.widgetOrder.length === 0) && config.mobileLayout?.sections?.length) {
      md.widgetOrder = migrateLegacy(config);
    }
    return md;
  }, [config.mobileDashboard, config.mobileLayout]);

  // Merge mobile-owned widget arrays into a "view config" used by hooks + renderer
  const viewConfig: DashboardConfig = useMemo(() => ({
    ...config,
    generalSensors: [...(config.generalSensors || []), ...mobileDash.generalSensors],
    sensorGrids: [...(config.sensorGrids || []), ...mobileDash.sensorGrids],
    actionWidgets: [...(config.actionWidgets || []), ...mobileDash.actionWidgets],
    cameraGrids: [...(config.cameraGrids || []), ...mobileDash.cameraGrids],
    rssFeeds: [...(config.rssFeeds || []), ...mobileDash.rssFeeds],
    vehicles: [...(config.vehicles || []), ...mobileDash.vehicles],
  }), [config, mobileDash]);

  const { getState: getCachedState, getAllStates, onStateChange } = useHAWebSocket(config);

  // Data hooks — fed the merged view config
  const { dataMap: generalData, loading: generalLoading } = useGeneralSensorData(viewConfig, getCachedState, onStateChange);
  const { dataMap: gridData, loading: gridLoading } = useSensorGridData(viewConfig, getCachedState, onStateChange);
  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config, getCachedState, onStateChange);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config, getCachedState, onStateChange);
  const { persons, loading: personLoading } = usePersonData(config, getCachedState, onStateChange, getAllStates);
  const { weather, loading: weatherLoading } = useWeatherData(config, getCachedState, onStateChange);
  const { menuDays, loading: menuLoading } = useFoodMenuData(config);
  const { dataMap: rssData, loading: rssLoading } = useRssNews(viewConfig.rssFeeds || [], config.refreshInterval);
  const { notifications, loading: notifLoading } = useNotificationData(viewConfig, getCachedState, onStateChange, getAllStates);
  const { vehicleDataMap, loading: vehicleLoading } = useVehicleData(viewConfig, getCachedState, onStateChange);
  const { pollenData, loading: pollenLoading } = usePollenData(config.pollenConfig, getCachedState, onStateChange);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme || "midnight-teal");
  }, [config.theme]);

  const fs = useMemo(() => resolveFontSizes(config.globalFontSizes, {}), [config.globalFontSizes]);
  const getFontSizes = (widgetId: string) => resolveFontSizes(config.globalFontSizes, config.widgetFontSizes?.[widgetId]);
  const ws = config.widgetStyles || {};

  const handleCellAction = (cell: { action?: any; confirmAction?: boolean; label?: string }) => {
    if (!cell.action) return;
    if (cell.confirmAction && !window.confirm(`Run action for "${cell.label || ""}"?`)) return;
    runAction(cell.action);
  };
  const handleInfoAction = (item: { action: any; confirmAction?: boolean; label?: string }) => {
    if (item.confirmAction && !window.confirm(`Run action for "${item.label || ""}"?`)) return;
    runAction(item.action);
  };

  const renderWidget = (id: string): React.ReactNode => {
    const widgetFs = getFontSizes(id);
    if (id === "electricity")
      return <ElectricityWidget nordpool={nordpool} loading={priceLoading} electricityStyle={config.electricityStyle} />;
    if (id === "calendar")
      return (
        <CalendarWidget
          events={events}
          loading={calLoading}
          fontSizes={widgetFs}
          dayColor={config.calendarDayColor}
          timeColor={config.calendarTimeColor}
          display={config.calendarDisplay}
          timeFormat={config.globalFormat?.timeFormat}
          widgetStyle={ws.calendar}
        />
      );
    if (id === "weather")
      return (
        <WeatherWidget
          weather={weather}
          loading={weatherLoading}
          showPrecipitation={config.weatherConfig?.showPrecipitation ?? true}
          showSunrise={config.weatherConfig?.showSunrise ?? true}
          showSunset={config.weatherConfig?.showSunset ?? true}
          weatherConfig={config.weatherConfig}
        />
      );
    if (id === "photos") return <PhotoWidget config={config.photoWidget} isDemo={false} />;
    if (id === "food_menu")
      return (
        <FoodMenuWidget
          days={menuDays}
          loading={menuLoading}
          fontSizes={widgetFs}
          displayMode={config.foodMenuConfig?.displayMode}
          style={config.foodMenuConfig?.style}
          showTitle={config.foodMenuConfig?.showTitle !== false}
        />
      );
    if (id === "notifications") return <NotificationWidget notifications={notifications} loading={notifLoading} />;
    if (id === "pollen") return <PollenWidget data={pollenData} loading={pollenLoading} pollenConfig={config.pollenConfig} />;
    if (id === "chores" && (config.enableChores || config.choreWidgetConfig?.enabled))
      return <ChoreWidget config={config.choreWidgetConfig} />;
    if (id.startsWith("temp_group_")) {
      const groupNum = parseInt(id.split("_")[2], 10);
      const groupSensors = tempSensors.filter((_, i) => (config.temperatureEntities[i]?.group ?? i) === groupNum);
      if (groupSensors.length === 0) return null;
      return <TemperatureWidget sensors={groupSensors} loading={tempLoading} fontSizes={widgetFs} />;
    }
    if (id.startsWith("person_")) {
      const idx = parseInt(id.split("_")[1], 10);
      const person = persons[idx];
      if (!person) return null;
      return (
        <PersonWidget
          person={person}
          loading={personLoading}
          fontSizes={widgetFs}
          personFontSizes={config.personCardFontSizes}
          widgetStyle={ws.person}
        />
      );
    }
    if (id.startsWith("general_")) {
      const sid = id.replace("general_", "");
      const sCfg = (viewConfig.generalSensors || []).find((s) => s.id === sid);
      if (!sCfg) return null;
      const sensorFs = sCfg.fontSize
        ? resolveFontSizes(config.globalFontSizes, { ...config.widgetFontSizes?.[id], ...sCfg.fontSize })
        : widgetFs;
      return (
        <GeneralSensorWidget
          config={sCfg}
          data={generalData[sid]}
          loading={generalLoading}
          fontSizes={sensorFs}
          onInfoAction={handleInfoAction}
          onHeaderAction={sCfg.headerAction ? () => {
            if (sCfg.confirmAction && !window.confirm(`Run action for "${sCfg.label}"?`)) return;
            runAction(sCfg.headerAction!);
          } : undefined}
        />
      );
    }
    if (id.startsWith("sensorgrid_")) {
      const gid = id.replace("sensorgrid_", "");
      const gCfg = (viewConfig.sensorGrids || []).find((g) => g.id === gid);
      if (!gCfg) return null;
      return <SensorGridWidget config={gCfg} data={gridData[gid]} loading={gridLoading} fontSizes={widgetFs} onCellAction={handleCellAction} />;
    }
    if (id.startsWith("action_")) {
      const aid = id.replace("action_", "");
      const aCfg = (viewConfig.actionWidgets || []).find((a) => a.id === aid);
      if (!aCfg) return null;
      return <ActionWidget config={aCfg} getState={getCachedState} compact />;
    }
    if (id.startsWith("cameragrid_")) {
      const cid = id.replace("cameragrid_", "");
      const cCfg = (viewConfig.cameraGrids || []).find((c) => c.id === cid);
      if (!cCfg) return null;
      return <CameraGridWidget config={cCfg} />;
    }
    if (id.startsWith("rss_")) {
      const rid = id.replace("rss_", "");
      const rCfg = (viewConfig.rssFeeds || []).find((f) => f.id === rid);
      if (!rCfg) return null;
      return <RssNewsWidget items={rssData[rid] || []} loading={rssLoading} label={rCfg.label} fontSizes={widgetFs} widgetStyle={ws.rss} />;
    }
    if (id.startsWith("vehicle_")) {
      const vid = id.replace("vehicle_", "");
      const vData = vehicleDataMap[vid];
      if (!vData) return null;
      const vCfg = (viewConfig.vehicles || []).find((v) => v.id === vid);
      return <VehicleWidget data={vData} loading={vehicleLoading} fontSizes={widgetFs} vehicleConfig={vCfg} />;
    }
    return null;
  };

  // Layout
  const widgetOrder = mobileDash.widgetOrder;
  const widgetLayouts = mobileDash.widgetLayouts || {};
  const gridColumns = Math.max(1, mobileDash.gridColumns || 2);
  const rowColumns = mobileDash.rowColumns || {};
  const rowHeights = mobileDash.rowHeights || {};
  const lockHeights = mobileDash.lockWidgetHeights ?? false;

  const getColSpan = (id: string) => {
    if (widgetLayouts[id]?.colSpan) return widgetLayouts[id].colSpan;
    return 1;
  };
  const getRow = (id: string) => widgetLayouts[id]?.row || 1;
  const getRowSpan = (id: string) => widgetLayouts[id]?.rowSpan || 1;
  const getWidgetGroup = (id: string) => widgetLayouts[id]?.widgetGroup || "";

  const rows = useMemo(() => {
    const rowMap = new Map<number, { id: string; span: number; rowSpan: number }[]>();
    for (const id of widgetOrder) {
      const row = getRow(id);
      const rowCols = rowColumns[row] || gridColumns;
      const span = Math.min(getColSpan(id), rowCols);
      const rSpan = getRowSpan(id);
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)!.push({ id, span, rowSpan: rSpan });
    }
    const sortedRows = [...rowMap.entries()].sort((a, b) => a[0] - b[0]);
    return sortedRows.map(([rowNum, widgets]) => {
      const rowCols = rowColumns[rowNum] || gridColumns;
      const totalSpan = widgets.reduce((s, w) => s + w.span, 0);
      const remaining = rowCols - totalSpan;
      let finalWidgets = widgets;
      if (remaining > 0 && widgets.length > 0) {
        finalWidgets = [...widgets];
        finalWidgets[finalWidgets.length - 1] = {
          ...finalWidgets[finalWidgets.length - 1],
          span: finalWidgets[finalWidgets.length - 1].span + remaining,
        };
      }
      return { rowNum, widgets: finalWidgets, cols: rowCols, heightPx: rowHeights[rowNum] };
    });
  }, [widgetOrder, gridColumns, rowColumns, rowHeights, widgetLayouts]);

  // Edit overlay save handler — writes back to mobileDashboard
  const handleLayoutSave = (slice: any) => {
    updateConfig({
      mobileDashboard: {
        ...mobileDash,
        widgetOrder: slice.widgetOrder ?? mobileDash.widgetOrder,
        widgetLayouts: slice.widgetLayouts ?? mobileDash.widgetLayouts,
        gridColumns: slice.gridColumns ?? mobileDash.gridColumns,
        rowColumns: slice.rowColumns ?? mobileDash.rowColumns,
      },
    });
  };

  const hasAnything = widgetOrder.length > 0;

  return (
    <div className={`min-h-screen text-foreground relative ${config.wallpaper?.enabled && config.wallpaper.url && config.wallpaper.applyToMobile !== false ? "" : "bg-background"}`} style={{ padding: "5px" }}>
      <WallpaperBackground wallpaper={config.wallpaper} context="mobile" />

      <header className="flex items-center justify-between mb-2 px-1">
        <h1 className="text-base font-semibold tracking-tight">HomeDash</h1>
        <div className="flex items-center gap-1">
          <Suspense fallback={null}>
            <DashboardEditOverlay
              allWidgetIds={widgetOrder}
              config={config}
              onSave={handleLayoutSave as any}
              renderWidget={renderWidget}
              getColSpan={getColSpan}
              getRow={getRow}
              getRowSpan={getRowSpan}
              gridColumns={gridColumns}
              isMobile={false}
              slice={{
                widgetOrder,
                widgetLayouts,
                gridColumns,
                rowColumns,
                rowHeights,
                lockWidgetHeights: lockHeights,
              }}
              label="Edit"
            />
            <ConfigPanel config={config} onSave={updateConfig} />
          </Suspense>
          <Link to="/" className="text-muted-foreground hover:text-foreground p-1" aria-label="Dashboard">
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {!hasAnything && (
        <div className="mt-12 text-center px-6">
          <p className="text-sm text-muted-foreground mb-2">No mobile widgets configured.</p>
          <p className="text-xs text-muted-foreground">
            Tap the settings icon → Mobile tab to add widgets, or mirror widgets from your main dashboard.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid" style={{ gap: "5px" }}>
        {rows.map(({ rowNum, widgets, cols, heightPx }) => {
          const rendered: { id: string; span: number; rSpan: number; groupId: string }[] = [];
          const seenGroups = new Set<string>();
          for (const w of widgets) {
            const groupId = getWidgetGroup(w.id);
            if (groupId && seenGroups.has(groupId)) continue;
            if (groupId) seenGroups.add(groupId);
            rendered.push({ id: w.id, span: w.span, rSpan: w.rowSpan, groupId });
          }
          return (
            <div
              key={rowNum}
              className="grid"
              style={{
                gap: "5px",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                ...(heightPx ? { minHeight: `${heightPx}px`, height: `${heightPx}px` } : { minHeight: "120px" }),
                ...((heightPx || lockHeights) ? { overflow: "hidden" } : {}),
              }}
            >
              {rendered.map(({ id, span, rSpan, groupId }) => {
                const widgetHeight = heightPx && rSpan > 1 ? `${heightPx * rSpan}px` : undefined;
                if (groupId) {
                  const groupMembers = widgets.filter((w) => getWidgetGroup(w.id) === groupId);
                  const groupWidgets = groupMembers
                    .map((w) => ({ id: w.id, node: renderWidget(w.id) }))
                    .filter((w) => w.node);
                  if (groupWidgets.length === 0) return null;
                  return (
                    <div
                      key={id}
                      className="widget-card h-full flex flex-col gap-2 overflow-hidden"
                      style={{
                        gridColumn: `span ${span}`,
                        gridRow: rSpan > 1 ? `span ${rSpan}` : undefined,
                        height: widgetHeight,
                        minHeight: !heightPx ? (rSpan > 1 ? `${rSpan * 200}px` : undefined) : undefined,
                      }}
                    >
                      {groupWidgets.map(({ id: wId, node }) => (
                        <div key={wId} className="flex-1 min-h-0">{node}</div>
                      ))}
                    </div>
                  );
                }
                const node = renderWidget(id);
                // Chart-heavy widgets need a definite height so recharts ResponsiveContainer renders
                const chartWidgetMinHeights: Record<string, number> = {
                  electricity: 260,
                  weather: 220,
                  photos: 250,
                };
                let intrinsicMin: string | undefined;
                if (!heightPx && rSpan <= 1) {
                  if (chartWidgetMinHeights[id]) intrinsicMin = `${chartWidgetMinHeights[id]}px`;
                  else if (id.startsWith("temp_group_") || id.startsWith("general_")) intrinsicMin = "220px";
                }
                return (
                  <div
                    key={id}
                    style={{
                      gridColumn: `span ${span}`,
                      gridRow: rSpan > 1 ? `span ${rSpan}` : undefined,
                      height: widgetHeight,
                      minHeight: !heightPx
                        ? (rSpan > 1 ? `${rSpan * 200}px` : intrinsicMin)
                        : undefined,
                      ...(lockHeights ? { overflow: "hidden" } : {}),
                      ...(!node ? { visibility: "hidden" as const } : {}),
                    }}
                  >
                    {node}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
