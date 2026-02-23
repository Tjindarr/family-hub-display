import { useMemo, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import PhotoWidget from "@/components/PhotoWidget";
import PersonWidget from "@/components/PersonWidget";
import WeatherWidget from "@/components/WeatherWidget";
import FoodMenuWidget from "@/components/FoodMenuWidget";
import GeneralSensorWidget from "@/components/GeneralSensorWidget";
import SensorGridWidget from "@/components/SensorGridWidget";
import RssNewsWidget from "@/components/RssNewsWidget";
import NotificationWidget from "@/components/NotificationWidget";
import VehicleWidget from "@/components/VehicleWidget";
import PollenWidget from "@/components/PollenWidget";
import ConfigPanel from "@/components/ConfigPanel";
import ConnectionStatus from "@/components/ConnectionStatus";
import DashboardEditOverlay from "@/components/DashboardEditOverlay";
import { useKioskMode } from "@/hooks/useKioskMode";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDashboardConfig,
  useTemperatureData,
  useCalendarData,
  useElectricityPrices,
  usePersonData,
  useWeatherData,
  useFoodMenuData,
} from "@/hooks/useDashboardData";
import { useGeneralSensorData } from "@/hooks/useGeneralSensorData";
import { useSensorGridData } from "@/hooks/useSensorGridData";
import { useRssNews } from "@/hooks/useRssNews";
import { useNotificationData } from "@/hooks/useNotificationData";
import { useVehicleData } from "@/hooks/useVehicleData";
import { usePollenData } from "@/hooks/usePollenData";
import { useHAWebSocket } from "@/hooks/useHAWebSocket";
import { resolveFontSizes } from "@/lib/fontSizes";

function getTempGroupIds(entities: { group?: number }[]): string[] {
  const seen = new Set<number>();
  const ids: string[] = [];
  entities.forEach((e, i) => {
    const g = e.group ?? i;
    if (!seen.has(g)) {
      seen.add(g);
      ids.push(`temp_group_${g}`);
    }
  });
  return ids;
}

function getDefaultWidgetIds(tempEntities: { group?: number }[], personCount: number, generalSensorIds: string[], sensorGridIds: string[], rssIds: string[], hasNotifications: boolean, vehicleIds: string[], hasPollen: boolean): string[] {
  return [
    ...getTempGroupIds(tempEntities),
    ...Array.from({ length: personCount }, (_, i) => `person_${i}`),
    "electricity",
    "calendar",
    "food_menu",
    "weather",
    "photos",
    ...generalSensorIds.map((id) => `general_${id}`),
    ...sensorGridIds.map((id) => `sensorgrid_${id}`),
    ...rssIds.map((id) => `rss_${id}`),
    ...(hasNotifications ? ["notifications"] : []),
    ...vehicleIds.map((id) => `vehicle_${id}`),
    ...(hasPollen ? ["pollen"] : []),
  ];
}

const Index = () => {
  const { config, updateConfig, isConfigured } = useDashboardConfig();
  const isDemo = !isConfigured;

  // Compute effective sensor grids (inject demo data when unconfigured)
  const effectiveSensorGrids = useMemo(() => {
    if (isDemo && (config.sensorGrids || []).length === 0) {
      return [{ id: "demo_grid", label: "Sensors", rows: 2, columns: 3, cells: [
        { entityId: "sensor.demo_1", label: "Humidity", icon: "droplets", unit: "%", color: "hsl(200, 70%, 55%)" },
        { entityId: "sensor.demo_2", label: "Pressure", icon: "gauge", unit: "hPa", color: "hsl(32, 95%, 55%)" },
        { entityId: "sensor.demo_3", label: "Wind", icon: "wind", unit: "m/s", color: "hsl(174, 72%, 50%)" },
        { entityId: "sensor.demo_4", label: "UV Index", icon: "sun", unit: "", color: "hsl(45, 90%, 55%)" },
        { entityId: "sensor.demo_5", label: "CO₂", icon: "cloud", unit: "ppm", color: "hsl(258, 60%, 60%)" },
        { entityId: "sensor.demo_6", label: "Noise", icon: "volume-2", unit: "dB", color: "hsl(0, 72%, 55%)" },
      ]}];
    }
    return config.sensorGrids || [];
  }, [isDemo, config.sensorGrids]);

  // Inject demo RSS feed
  const effectiveRssFeeds = useMemo(() => {
    if (isDemo && (config.rssFeeds || []).length === 0) {
      return [{ id: "demo_rss", label: "News", feedUrl: "https://demo.example.com/rss", maxItems: 5 }];
    }
    return config.rssFeeds || [];
  }, [isDemo, config.rssFeeds]);

  // Inject demo vehicle
  const effectiveVehicles = useMemo(() => {
    if (isDemo && (config.vehicles || []).length === 0) {
      return [{
        id: "demo_vehicle",
        name: "Tesla Model 3",
        icon: "mdi:car-electric",
        sections: [
          { id: "bat", type: "battery" as const, label: "Battery", entities: [
            { entityId: "sensor.demo_bat", label: "Battery", icon: "mdi:battery-charging-70", unit: "%", color: "hsl(120, 50%, 50%)" },
            { entityId: "sensor.demo_range", label: "Range", icon: "mdi:map-marker-distance", unit: "km", color: "hsl(210, 80%, 55%)" },
          ]},
          { id: "climate", type: "climate" as const, label: "Climate", entities: [
            { entityId: "sensor.demo_temp", label: "Interior", icon: "mdi:thermometer", unit: "°C", color: "hsl(32, 95%, 55%)" },
          ]},
          { id: "doors", type: "doors" as const, label: "Doors", entities: [
            { entityId: "sensor.demo_lock", label: "Lock", icon: "mdi:car-door-lock", unit: "", color: "hsl(174, 72%, 50%)" },
          ]},
        ],
      }];
    }
    return config.vehicles || [];
  }, [isDemo, config.vehicles]);

  // Inject demo general sensor
  const effectiveGeneralSensors = useMemo(() => {
    if (isDemo && (config.generalSensors || []).length === 0) {
      return [{
        id: "demo_power",
        label: "Power Usage",
        showLabel: true,
        icon: "zap",
        showGraph: true,
        historyHours: 24,
        chartGrouping: "hour" as const,
        chartSeries: [
          { entityId: "sensor.demo_power", label: "Power", color: "hsl(45, 90%, 55%)", chartType: "area" as const },
        ],
        topInfo: [
          { entityId: "sensor.demo_power_now", label: "Now", unit: "W", color: "hsl(45, 90%, 55%)" },
          { entityId: "sensor.demo_power_today", label: "Today", unit: "kWh", color: "hsl(174, 72%, 50%)" },
        ],
        bottomInfo: [
          { entityId: "sensor.demo_power_avg", label: "Avg", unit: "W", color: "hsl(215, 12%, 55%)" },
          { entityId: "sensor.demo_power_peak", label: "Peak", unit: "W", color: "hsl(0, 72%, 55%)" },
        ],
      }];
    }
    return config.generalSensors || [];
  }, [isDemo, config.generalSensors]);

  // Inject demo notification config
  const effectiveNotificationConfig = useMemo(() => {
    if (isDemo && !config.notificationConfig) {
      return { showHANotifications: true, alertRules: [] };
    }
    return config.notificationConfig;
  }, [isDemo, config.notificationConfig]);

  // Inject demo pollen config
  const effectivePollenConfig = useMemo(() => {
    if (isDemo && (config.pollenConfig?.sensors?.length ?? 0) === 0) {
      return {
        sensors: [
          { entityId: "sensor.demo_birch", label: "Björk", icon: "mdi:tree", color: "hsl(80, 50%, 50%)" },
          { entityId: "sensor.demo_grass", label: "Gräs", icon: "mdi:grass", color: "hsl(120, 40%, 45%)" },
          { entityId: "sensor.demo_mugwort", label: "Gråbo", icon: "mdi:flower", color: "hsl(35, 80%, 50%)" },
        ],
        forecastDays: 4,
        showLabel: true,
        showForecast: true,
      };
    }
    return config.pollenConfig;
  }, [isDemo, config.pollenConfig]);

  const effectiveConfig = useMemo(() => ({
    ...config,
    sensorGrids: effectiveSensorGrids,
    rssFeeds: effectiveRssFeeds,
    vehicles: effectiveVehicles,
    generalSensors: effectiveGeneralSensors,
    notificationConfig: effectiveNotificationConfig,
    pollenConfig: effectivePollenConfig,
  }), [config, effectiveSensorGrids, effectiveRssFeeds, effectiveVehicles, effectiveGeneralSensors, effectiveNotificationConfig, effectivePollenConfig]);

  // WebSocket connection for real-time state updates
  const { getState: getCachedState, getAllStates, onStateChange, isConnected, wsState } = useHAWebSocket(config);

  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config, getCachedState, onStateChange);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config, getCachedState, onStateChange);
  const { persons, loading: personLoading } = usePersonData(config, getCachedState, onStateChange, getAllStates);
  const { weather, loading: weatherLoading } = useWeatherData(config, getCachedState, onStateChange);
  const { menuDays, loading: menuLoading } = useFoodMenuData(config);
  const { dataMap: generalSensorData, loading: generalSensorLoading } = useGeneralSensorData(effectiveConfig, getCachedState, onStateChange);
  const { dataMap: sensorGridData, loading: sensorGridLoading } = useSensorGridData(effectiveConfig, getCachedState, onStateChange);
  const rssFeeds = effectiveRssFeeds;
  const { dataMap: rssData, loading: rssLoading } = useRssNews(rssFeeds, config.refreshInterval);
  const { notifications, loading: notifLoading } = useNotificationData(effectiveConfig, getCachedState, onStateChange, getAllStates);
  const { vehicleDataMap, loading: vehicleLoading } = useVehicleData(effectiveConfig, getCachedState, onStateChange);
  const { pollenData: rawPollenData, loading: pollenLoading } = usePollenData(effectivePollenConfig, getCachedState, onStateChange);

  // Provide mock pollen data in demo mode
  const pollenData = useMemo(() => {
    if (isDemo && rawPollenData.sensors.length === 0 && (effectivePollenConfig?.sensors?.length ?? 0) > 0) {
      const mockLevels = [1, 3, 5];
      return {
        sensors: effectivePollenConfig!.sensors.map((s, idx) => ({
          entityId: s.entityId,
          label: s.label,
          icon: s.icon,
          color: s.color,
          state: ["Låga halter", "Måttliga halter", "Höga halter"][idx % 3],
          numericState: mockLevels[idx % 3],
          forecast: [0, 1, 2, 3].map((i) => ({
            date: "",
            level: String((idx + i) % 5),
            numericLevel: (idx + i) % 5,
          })),
        })),
      };
    }
    return rawPollenData;
  }, [isDemo, rawPollenData, effectivePollenConfig]);
  const { isKiosk, enterKiosk, exitKiosk } = useKioskMode();
  const isMobile = useIsMobile();

  // Blackout schedule
  const [isBlackout, setIsBlackout] = useState(false);
  useEffect(() => {
    const blackout = config.blackout;
    if (!blackout?.enabled || !isKiosk) { setIsBlackout(false); return; }
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { from, to } = blackout;
      if (from <= to) {
        setIsBlackout(hhmm >= from && hhmm < to);
      } else {
        // wraps midnight, e.g. 23:00 -> 06:00
        setIsBlackout(hhmm >= from || hhmm < to);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [config.blackout, isKiosk]);

  const generalSensorIds = effectiveGeneralSensors.map((s) => s.id);
  const sensorGridIds = effectiveSensorGrids.map((s) => s.id);
  const rssIds = rssFeeds.map((f) => f.id);
  const vehicleIds = effectiveVehicles.map((v) => v.id);
  const personCount = isDemo ? Math.max(1, (config.personEntities || []).length) : (config.personEntities || []).length;

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme || "midnight-teal");
  }, [config.theme]);

  const gridColumns = isMobile ? 1 : (config.gridColumns || 4);
  const rowColumns = config.rowColumns || {};
  const rowHeights = config.rowHeights || {};
  const lockHeights = config.lockWidgetHeights ?? false;

  // Font size resolver
  const getFontSizes = (widgetId: string) =>
    resolveFontSizes(config.globalFontSizes, config.widgetFontSizes?.[widgetId]);

  const hasNotifications = isDemo || (effectiveNotificationConfig?.showHANotifications || (effectiveNotificationConfig?.alertRules?.length > 0)) || false;
  const hasPollen = (effectivePollenConfig?.sensors?.length ?? 0) > 0;

  // Resolve ordered widget IDs
  const allWidgetIds = useMemo(() => {
    const defaults = getDefaultWidgetIds(config.temperatureEntities, personCount, generalSensorIds, sensorGridIds, rssIds, hasNotifications, vehicleIds, hasPollen);
    if (config.widgetOrder && config.widgetOrder.length > 0) {
      const validSet = new Set(defaults);
      const ordered = config.widgetOrder.filter((id) => validSet.has(id));
      const missing = defaults.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    }
    return defaults;
  }, [config.widgetOrder, config.temperatureEntities, personCount, generalSensorIds, sensorGridIds, rssIds, hasNotifications, hasPollen]);

  const getWidgetGroup = (id: string) => config.widgetLayouts?.[id]?.widgetGroup || "";

  const renderWidget = (id: string) => {
    const fs = getFontSizes(id);
    const ws = config.widgetStyles || {};

    if (id === "electricity") return <ElectricityWidget nordpool={nordpool} loading={priceLoading} electricityStyle={config.electricityStyle} />;
    if (id === "calendar") return <CalendarWidget events={events} loading={calLoading} fontSizes={fs} dayColor={config.calendarDayColor} timeColor={config.calendarTimeColor} display={config.calendarDisplay} timeFormat={config.globalFormat?.timeFormat} widgetStyle={ws.calendar} />;
    if (id === "weather") return (
      <WeatherWidget
        weather={weather}
        loading={weatherLoading}
        showPrecipitation={config.weatherConfig?.showPrecipitation ?? true}
        showSunrise={config.weatherConfig?.showSunrise ?? true}
        showSunset={config.weatherConfig?.showSunset ?? true}
        weatherConfig={config.weatherConfig}
      />
    );
    if (id === "photos") return <PhotoWidget config={config.photoWidget} isDemo={isDemo} />;
    if (id.startsWith("temp_group_")) {
      const groupNum = parseInt(id.split("_")[2], 10);
      const groupSensors = tempSensors.filter((_, i) => (config.temperatureEntities[i]?.group ?? i) === groupNum);
      if (groupSensors.length === 0) return null;
      return <TemperatureWidget sensors={groupSensors} loading={tempLoading} fontSizes={fs} />;
    }
    if (id.startsWith("person_")) {
      const idx = parseInt(id.split("_")[1], 10);
      const person = persons[idx];
      if (!person) return null;
      return <PersonWidget person={person} loading={personLoading} fontSizes={fs} personFontSizes={config.personCardFontSizes} widgetStyle={ws.person} />;
    }
    if (id === "food_menu") return <FoodMenuWidget days={menuDays} loading={menuLoading} fontSizes={fs} displayMode={config.foodMenuConfig?.displayMode} style={config.foodMenuConfig?.style} showTitle={config.foodMenuConfig?.showTitle !== false} />;
    if (id.startsWith("general_")) {
      const sensorId = id.replace("general_", "");
      const sensorConfig = effectiveGeneralSensors.find((s) => s.id === sensorId);
      if (!sensorConfig) return null;
      const sensorData = generalSensorData[sensorId];
      const sensorFs = sensorConfig.fontSize
        ? resolveFontSizes(config.globalFontSizes, { ...config.widgetFontSizes?.[id], ...sensorConfig.fontSize })
        : fs;
      return <GeneralSensorWidget config={sensorConfig} data={sensorData} loading={generalSensorLoading} fontSizes={sensorFs} />;
    }
    if (id.startsWith("sensorgrid_")) {
      const gridId = id.replace("sensorgrid_", "");
      const gridConfig = effectiveSensorGrids.find((s) => s.id === gridId);
      if (!gridConfig) return null;
      const gridData = sensorGridData[gridId];
      return <SensorGridWidget config={gridConfig} data={gridData} loading={sensorGridLoading} fontSizes={fs} />;
    }
    if (id.startsWith("rss_")) {
      const rssId = id.replace("rss_", "");
      const rssCfg = rssFeeds.find((f) => f.id === rssId);
      if (!rssCfg) return null;
      return <RssNewsWidget items={rssData[rssId] || []} loading={rssLoading} label={rssCfg.label} fontSizes={fs} widgetStyle={ws.rss} />;
    }
    if (id === "notifications") {
      return <NotificationWidget notifications={notifications} loading={notifLoading} />;
    }
    if (id.startsWith("vehicle_")) {
      const vehicleId = id.replace("vehicle_", "");
      const vData = vehicleDataMap[vehicleId];
      if (!vData) return null;
      const vConfig = config.vehicles?.find(v => v.id === vehicleId);
      return <VehicleWidget data={vData} loading={vehicleLoading} fontSizes={fs} vehicleConfig={vConfig} />;
    }
    if (id === "pollen") {
      return <PollenWidget data={pollenData} loading={pollenLoading} pollenConfig={effectivePollenConfig} />;
    }
    return null;
  };

  const getColSpan = (id: string) => {
    if (config.widgetLayouts?.[id]?.colSpan) return config.widgetLayouts[id].colSpan;
    if (id === "electricity" || id === "calendar" || id === "weather") return 2;
    if (id === "photos" || id === "food_menu") return 2;
    return 1;
  };

  const getRow = (id: string) => {
    if (config.widgetLayouts?.[id]?.row) return config.widgetLayouts[id].row;
    if (id === "electricity" || id === "calendar") return 2;
    if (id === "photos") return 1;
    return 1;
  };

  const getRowSpan = (id: string) => {
    return config.widgetLayouts?.[id]?.rowSpan || 1;
  };

  // Group widgets by row, then stretch last widget per row to fill
  const rows = useMemo(() => {
    const rowMap = new Map<number, { id: string; span: number; rowSpan: number }[]>();

    for (const id of allWidgetIds) {
      const row = getRow(id);
      const rowCols = isMobile ? 1 : (rowColumns[row] || gridColumns);
      const span = Math.min(getColSpan(id), rowCols);
      const rSpan = getRowSpan(id);
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)!.push({ id, span, rowSpan: rSpan });
    }

    const sortedRows = [...rowMap.entries()].sort((a, b) => a[0] - b[0]);

    return sortedRows.map(([rowNum, widgets]) => {
      const rowCols = isMobile ? 1 : (rowColumns[rowNum] || gridColumns);
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
  }, [allWidgetIds, gridColumns, rowColumns, rowHeights, isMobile, config.widgetLayouts]);

  if (isBlackout) {
    return <div className="fixed inset-0 bg-black z-[9999]" onClick={() => setIsBlackout(false)} />;
  }

  return (
    <div className="min-h-screen bg-background" style={{ padding: "5px" }}>
      {!isKiosk && (
        <>
          <div className="fixed right-4 top-4 z-50 flex items-center gap-1">
            <DashboardEditOverlay
              allWidgetIds={allWidgetIds}
              config={config}
              onSave={updateConfig}
              renderWidget={renderWidget}
              getColSpan={getColSpan}
              getRow={getRow}
              getRowSpan={getRowSpan}
              gridColumns={gridColumns}
              isMobile={isMobile}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={enterKiosk}
              className="text-muted-foreground hover:text-foreground"
              title="Enter kiosk mode"
            >
              <Monitor className="h-5 w-5" />
            </Button>
            <ConfigPanel config={config} onSave={updateConfig} />
          </div>
        </>
      )}

      {/* Header - hidden in kiosk */}
      {!isKiosk && (
        <header className="mb-4 sm:mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Home Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <ConnectionStatus isConfigured={isConfigured} wsState={wsState} />
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
          </div>
        </header>
      )}

      {/* Grid */}
      <div className="grid" style={{ gap: "5px" }}>
        {rows.map(({ rowNum, widgets, cols, heightPx }) => {
          // Group widgets by widgetGroup within each row
          const rendered: { id: string; span: number; rSpan: number; groupId: string }[] = [];
          const seenGroups = new Set<string>();

          for (const w of widgets) {
            const groupId = getWidgetGroup(w.id);
            if (groupId && seenGroups.has(groupId)) continue; // already rendered as part of group
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
                ...(!isMobile && heightPx ? { minHeight: `${heightPx}px`, height: `${heightPx}px` } : !isMobile ? { minHeight: '120px' } : {}),
                ...(!isMobile && (heightPx || lockHeights) ? { overflow: 'hidden' } : {}),
              }}
            >
              {rendered.map(({ id, span, rSpan, groupId }) => {
                const mobileSpan = isMobile ? 1 : span;
                const mobileRowSpan = isMobile ? 1 : rSpan;
                const widgetHeight = heightPx && mobileRowSpan > 1
                  ? `${heightPx * mobileRowSpan}px`
                  : undefined;

                // If this widget is the lead of a group, stack all group members
                if (groupId) {
                  const groupMembers = widgets.filter((w) => getWidgetGroup(w.id) === groupId);
                  const groupWidgets = groupMembers.map((w) => ({ id: w.id, node: renderWidget(w.id) })).filter((w) => w.node);
                  if (groupWidgets.length === 0) return null;
                  return (
                    <div
                      key={id}
                      className={`widget-card h-full flex flex-col gap-2 overflow-hidden`}
                      style={{
                        gridColumn: `span ${mobileSpan}`,
                        gridRow: mobileRowSpan > 1 ? `span ${mobileRowSpan}` : undefined,
                        height: widgetHeight,
                        minHeight: !heightPx
                          ? (mobileRowSpan > 1 ? `${mobileRowSpan * 200}px` : undefined)
                          : undefined,
                      }}
                    >
                      {groupWidgets.map(({ id: wId, node }) => (
                        <div key={wId} className="flex-1 min-h-0">{node}</div>
                      ))}
                    </div>
                  );
                }

                // Normal ungrouped widget
                const widget = renderWidget(id);
                if (!widget) return null;
                return (
                  <div
                    key={id}
                    style={{
                      gridColumn: `span ${mobileSpan}`,
                      gridRow: mobileRowSpan > 1 ? `span ${mobileRowSpan}` : undefined,
                      height: widgetHeight,
                      minHeight: !heightPx
                        ? (id === "photos" && isMobile ? "250px" : (mobileRowSpan > 1 ? `${mobileRowSpan * 200}px` : undefined))
                        : undefined,
                      ...(lockHeights ? { overflow: 'hidden' } : {}),
                    }}
                  >
                    {widget}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Kiosk exit hint */}
      {isKiosk && (
        <div className="fixed bottom-2 right-2 text-[10px] text-muted-foreground/30 select-none">
          Triple-click to exit kiosk
        </div>
      )}
    </div>
  );
};

export default Index;
