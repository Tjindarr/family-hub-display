import { useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import PhotoWidget from "@/components/PhotoWidget";
import PersonWidget from "@/components/PersonWidget";
import WeatherWidget from "@/components/WeatherWidget";
import CarWidget from "@/components/CarWidget";
import MonthlyEnergyWidget from "@/components/MonthlyEnergyWidget";
import PowerUsageWidget from "@/components/PowerUsageWidget";
import FoodMenuWidget from "@/components/FoodMenuWidget";
import ConfigPanel from "@/components/ConfigPanel";
import ConnectionStatus from "@/components/ConnectionStatus";
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
  useCarData,
  useEnergyUsageData,
  useFoodMenuData,
} from "@/hooks/useDashboardData";

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

function getDefaultWidgetIds(tempEntities: { group?: number }[], personCount: number, hasCar: boolean, hasEnergy: boolean): string[] {
  return [
    ...getTempGroupIds(tempEntities),
    ...Array.from({ length: personCount }, (_, i) => `person_${i}`),
    ...(hasCar ? ["car"] : []),
    "electricity",
    ...(hasEnergy ? ["monthly_energy", "power_usage"] : []),
    "calendar",
    "food_menu",
    "weather",
    "photos",
  ];
}

const Index = () => {
  const { config, updateConfig, isConfigured } = useDashboardConfig();
  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config);
  const { persons, loading: personLoading } = usePersonData(config);
  const { weather, loading: weatherLoading } = useWeatherData(config);
  const { charger, fuel, battery, loading: carLoading } = useCarData(config);
  const { monthly, power, loading: energyLoading } = useEnergyUsageData(config);
  const { menuDays, loading: menuLoading } = useFoodMenuData(config);
  const { isKiosk, enterKiosk, exitKiosk } = useKioskMode();
  const isMobile = useIsMobile();

  const isDemo = !isConfigured;
  const hasCar = isDemo || !!(config.carConfig?.chargerEntity?.trim() || config.carConfig?.fuelRangeEntity?.trim() || config.carConfig?.batteryEntity?.trim());
  const hasEnergy = isDemo || !!(config.energyUsageConfig?.monthlyCostEntity?.trim() || config.energyUsageConfig?.currentPowerEntity?.trim());
  const personCount = isDemo ? Math.max(1, (config.personEntities || []).length) : (config.personEntities || []).length;

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme || "midnight-teal");
  }, [config.theme]);

  const gridColumns = isMobile ? 1 : (config.gridColumns || 4);
  const rowColumns = config.rowColumns || {};
  const rowHeights = config.rowHeights || {};

  // Resolve ordered widget IDs
  const allWidgetIds = useMemo(() => {
    const defaults = getDefaultWidgetIds(config.temperatureEntities, personCount, hasCar, hasEnergy);
    if (config.widgetOrder && config.widgetOrder.length > 0) {
      const validSet = new Set(defaults);
      const ordered = config.widgetOrder.filter((id) => validSet.has(id));
      const missing = defaults.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    }
    return defaults;
  }, [config.widgetOrder, config.temperatureEntities, personCount, hasCar, hasEnergy]);

  const getWidgetGroup = (id: string) => config.widgetLayouts?.[id]?.widgetGroup || "";

  const renderWidget = (id: string) => {
    
    if (id === "electricity") return <ElectricityWidget nordpool={nordpool} loading={priceLoading} />;
    if (id === "calendar") return <CalendarWidget events={events} loading={calLoading} />;
    if (id === "weather") return (
      <WeatherWidget
        weather={weather}
        loading={weatherLoading}
        showPrecipitation={config.weatherConfig?.showPrecipitation ?? true}
        showSunrise={config.weatherConfig?.showSunrise ?? true}
        showSunset={config.weatherConfig?.showSunset ?? true}
      />
    );
    if (id === "photos") return <PhotoWidget config={config.photoWidget} />;
    if (id.startsWith("temp_group_")) {
      const groupNum = parseInt(id.split("_")[2], 10);
      const groupSensors = tempSensors.filter((_, i) => (config.temperatureEntities[i]?.group ?? i) === groupNum);
      if (groupSensors.length === 0) return null;
      return <TemperatureWidget sensors={groupSensors} loading={tempLoading} />;
    }
    if (id.startsWith("person_")) {
      const idx = parseInt(id.split("_")[1], 10);
      const person = persons[idx];
      if (!person) return null;
      return <PersonWidget person={person} loading={personLoading} />;
    }
    if (id === "car") return <CarWidget charger={charger} fuel={fuel} battery={battery} loading={carLoading} />;
    if (id === "monthly_energy") return <MonthlyEnergyWidget data={monthly} loading={energyLoading} />;
    if (id === "power_usage") return <PowerUsageWidget data={power} loading={energyLoading} />;
    if (id === "food_menu") return <FoodMenuWidget days={menuDays} loading={menuLoading} />;
    return null;
  };

  const getColSpan = (id: string) => {
    if (config.widgetLayouts?.[id]?.colSpan) return config.widgetLayouts[id].colSpan;
    if (id === "electricity" || id === "calendar" || id === "weather") return 2;
    if (id === "photos" || id === "car" || id === "monthly_energy" || id === "power_usage" || id === "food_menu") return 2;
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

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      {!isKiosk && (
        <>
          <ConfigPanel config={config} onSave={updateConfig} />
          <Button
            variant="ghost"
            size="icon"
            onClick={enterKiosk}
            className="fixed right-14 top-4 z-50 text-muted-foreground hover:text-foreground"
            title="Enter kiosk mode"
          >
            <Monitor className="h-5 w-5" />
          </Button>
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
              <ConnectionStatus isConfigured={isConfigured} />
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
          </div>
        </header>
      )}

      {/* Grid */}
      <div className="grid gap-2">
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
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                ...(heightPx ? { minHeight: `${heightPx}px`, height: `${heightPx}px` } : {}),
                overflow: 'hidden',
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
                      className="widget-card h-full flex flex-col gap-2 overflow-hidden"
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
